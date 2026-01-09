"""API router registration."""

from fastapi import FastAPI

from . import admin, auth, categories, insights, interactions, payment, points, recharge, resources, uploads, users, search, analytics, notifications, messages, email


ALL_ROUTERS = [
    auth.router,
    users.router,
    resources.router,
    categories.router,
    points.router,
    admin.router,
    uploads.router,
    insights.router,
    payment.router,
    recharge.router,
    interactions.router,
    search.router,
    analytics.router,
    notifications.router,
    messages.router,
    email.router,
]


def register_routers(app: FastAPI) -> None:
    for router in ALL_ROUTERS:
        app.include_router(router)
