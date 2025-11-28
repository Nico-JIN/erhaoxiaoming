"""Router registry."""

from fastapi import FastAPI

from . import admin, auth, categories, insights, interactions, payment, points, recharge, resources, uploads, users


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
]


def register_routers(app: FastAPI) -> None:
    """Include all routers on the given FastAPI app."""

    for router in ALL_ROUTERS:
        app.include_router(router)
