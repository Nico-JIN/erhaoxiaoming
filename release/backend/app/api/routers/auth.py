"""Authentication endpoints."""

from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from backend.app.core.security import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    get_password_hash,
)
from backend.app.db.session import get_db
from backend.app.models import User, UserRole, OAuthAccount, OAuthProvider
from backend.app.schemas import OAuthLogin, Token, UserCreate, UserLogin, UserResponse
from backend.app.services.operations import log_operation
from backend.app.services.points import grant_register_reward
from backend.app.services.oauth import qq_oauth, wechat_oauth, google_oauth, github_oauth


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new user."""

    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    if user_data.email:
        existing_email = db.query(User).filter(User.email == user_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

    if user_data.phone:
        existing_phone = db.query(User).filter(User.phone == user_data.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered",
            )

    hashed_password = get_password_hash(user_data.password) if user_data.password else None
    new_user = User(
        email=user_data.email,
        phone=user_data.phone,
        username=user_data.username,
        hashed_password=hashed_password,
        full_name=user_data.full_name or user_data.username,
        role=UserRole.USER,
        points=0,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    grant_register_reward(db, new_user)
    db.refresh(new_user)

    log_operation(
        db=db,
        user_id=new_user.id,
        action="USER_REGISTER",
        resource_type="user",
        resource_id=str(new_user.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return new_user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Login with username/email/phone and password."""

    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    log_operation(
        db=db,
        user_id=user.id,
        action="USER_LOGIN",
        resource_type="user",
        resource_id=str(user.id),
        ip_address=request.client.host if request.client else "0.0.0.0",
        user_agent=request.headers.get("user-agent", ""),
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.get("/oauth/{provider}/url")
async def get_oauth_url(provider: str):
    """Get OAuth authorization URL for the specified provider."""
    state = secrets.token_urlsafe(32)
    
    oauth_services = {
        "qq": qq_oauth,
        "wechat": wechat_oauth,
        "google": google_oauth,
        "github": github_oauth
    }
    
    service = oauth_services.get(provider.lower())
    if not service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    auth_url = service.get_authorization_url(state)
    return {
        "url": auth_url,
        "state": state
    }


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str = None,
    error: str = None,
    error_description: str = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    """Handle OAuth callback and create/login user."""
    
    print(f"\n[OAuth Callback] Provider: {provider}")
    
    # 处理用户取消授权或错误
    if error:
        print(f"[OAuth Callback] Error from provider: {error}")
        error_messages = {
            'access_denied': '用户取消了授权',
            'unauthorized_client': '应用未授权',
            'invalid_request': '无效的请求',
            'unsupported_response_type': '不支持的响应类型',
            'invalid_scope': '无效的权限范围',
            'server_error': '服务器错误',
            'temporarily_unavailable': '服务暂时不可用',
        }
        
        friendly_message = error_messages.get(error, error_description or '登录失败')
        print(f"[OAuth Callback] Redirecting to error page: {friendly_message}")
        
        # 重定向到前端错误页面
        from urllib.parse import quote
        frontend_url = f"https://ai.dxin.store/auth/callback/error?message={quote(friendly_message)}&provider={provider}"
        return RedirectResponse(url=frontend_url)
    
    if not code:
        print(f"[OAuth Callback] No code received")
        frontend_url = f"https://ai.dxin.store/auth/callback/error?message=授权码缺失&provider={provider}"
        return RedirectResponse(url=frontend_url)
    
    print(f"[OAuth Callback] Code received: {code[:20]}...")
    
    oauth_services = {
        "qq": (qq_oauth, OAuthProvider.QQ),
        "wechat": (wechat_oauth, OAuthProvider.WECHAT),
        "google": (google_oauth, OAuthProvider.GOOGLE),
        "github": (github_oauth, OAuthProvider.GITHUB)
    }
    
    service_info = oauth_services.get(provider.lower())
    if not service_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    service, provider_enum = service_info
    
    try:
        # Get access token
        if provider.lower() == "wechat":
            token_data = await service.get_access_token(code)
            if not token_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get access token from WeChat"
                )
            access_token = token_data.get("access_token")
            openid = token_data.get("openid")
            user_info = await service.get_user_info(access_token, openid)
        else:
            access_token = await service.get_access_token(code)
            if not access_token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to get access token from {provider}"
                )
            user_info = await service.get_user_info(access_token)
        
        if not user_info or not user_info.get("provider_user_id"):
            print(f"[OAuth Callback] Failed to get user info: {user_info}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from OAuth provider"
            )
        
        provider_user_id = user_info["provider_user_id"]
        print(f"[OAuth Callback] User ID from provider: {provider_user_id}")
        
        # Check if OAuth account exists
        oauth_account = db.query(OAuthAccount).filter(
            OAuthAccount.provider == provider_enum,
            OAuthAccount.provider_user_id == provider_user_id
        ).first()
        
        if oauth_account:
            # Existing user, login
            print(f"[OAuth Callback] Existing user found: {oauth_account.user.username}")
            user = oauth_account.user
            user.last_login = datetime.utcnow()
            
            # Update OAuth token
            oauth_account.access_token = access_token
            db.commit()
        else:
            # New user, register
            print(f"[OAuth Callback] Creating new user...")
            # For Google and GitHub, use email; for QQ/WeChat, generate username
            username = user_info.get("username", f"{provider}_{provider_user_id[:8]}")
            
            # Check if username already exists, make it unique
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                username = f"{username}_{secrets.token_hex(4)}"
            
            print(f"[OAuth Callback] Creating user with username: {username}")
            # Create new user
            user = User(
                username=username,
                email=user_info.get("email"),
                full_name=user_info.get("full_name", username),
                avatar_url=user_info.get("avatar_url"),
                role=UserRole.USER,
                points=0,
                is_verified=user_info.get("is_verified", False),
                hashed_password=None  # OAuth users don't have password
            )
            db.add(user)
            db.flush()
            
            # Create OAuth account
            oauth_account = OAuthAccount(
                user_id=user.id,
                provider=provider_enum,
                provider_user_id=provider_user_id,
                access_token=access_token
            )
            db.add(oauth_account)
            db.commit()
            db.refresh(user)
            
            # Grant registration reward
            grant_register_reward(db, user)
            db.refresh(user)
            print(f"[OAuth Callback] New user created successfully: {user.username}")
        
        # Log operation
        log_operation(
            db=db,
            user_id=user.id,
            action=f"OAUTH_LOGIN_{provider.upper()}",
            resource_type="user",
            resource_id=str(user.id),
            ip_address=request.client.host if request.client else "0.0.0.0",
            user_agent=request.headers.get("user-agent", ""),
        )
        
        # Create tokens
        access_token_jwt = create_access_token(data={"sub": user.id})
        refresh_token_jwt = create_refresh_token(data={"sub": user.id})
        
        print(f"[OAuth Callback] Login successful for user: {user.username}")
        
        # Redirect to frontend with tokens
        frontend_url = f"https://ai.dxin.store/auth/callback/success?access_token={access_token_jwt}&refresh_token={refresh_token_jwt}"
        return RedirectResponse(url=frontend_url)
    except HTTPException as http_exc:
        # HTTP异常，重定向到错误页面
        from urllib.parse import quote
        error_msg = http_exc.detail or 'OAuth认证失败'
        print(f"[OAuth Callback] HTTP Exception: {error_msg}")
        frontend_url = f"https://ai.dxin.store/auth/callback/error?message={quote(error_msg)}&provider={provider}"
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        print(f"[OAuth Callback] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        # 重定向到错误页面
        from urllib.parse import quote
        error_msg = f"登录失败，请稍后重试"
        frontend_url = f"https://ai.dxin.store/auth/callback/error?message={quote(error_msg)}&provider={provider}"
        return RedirectResponse(url=frontend_url)


@router.post("/refresh", response_model=Token)
async def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    """Placeholder for refresh token flow."""

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh token not yet implemented",
    )
