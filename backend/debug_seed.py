import asyncio
from app.database import SessionLocal
from app.routers.admin import seed_demo

async def main():
    db = SessionLocal()
    try:
        print("Invoking seed_demo...")
        res = await seed_demo(password="admin123", db=db)
        print("Success:", res)
    except Exception as e:
        print("Error:", e)
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
