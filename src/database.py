from sqlalchemy import create_engine, Column, Integer,Float, String, JSON, DateTime, Index
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import inspect
from datetime import datetime
import uuid
import os
import time

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
print(DATABASE_URL)
engine = create_engine(DATABASE_URL, pool_size=5, max_overflow=10)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    profile_data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index('idx_username', 'username'),
        Index('idx_updated_at', 'updated_at'),
    )

class Video(Base):
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True)
    video_id = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    video_metadata = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    __table_args__ = (
        Index('idx_video_username', 'username'),
        Index('idx_video_id', 'video_id'),
        Index('idx_video_updated', 'updated_at'),
        Index('idx_username_updated', 'username', 'updated_at'),
    )

class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    rating = Column(Float, nullable=False)
    comment = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)

    __table_args__ = (
        Index('idx_name', 'name'),
        Index('idx_created_at', 'created_at'),
    )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "users" in existing_tables and "videos" in existing_tables and "comments" in existing_tables:
        print("Tables already exist. Skipping creation.")
    else:
        print("Tables do not exist. Creating tables.")
        Base.metadata.create_all(bind=engine)

# def init_db():
#     Base.metadata.create_all(bind=engine)

async def get_cached_user_data(username):
    db = next(get_db())
    try:
        user = db.query(User).filter_by(username=username).first()
        if user:
            videos = db.query(Video).filter_by(username=username).all()
            return user.profile_data, [video.video_metadata for video in videos]
        return None, None
    finally:
        db.close()

async def store_user_data(username, profile_data, videos_data):
    db = next(get_db())
    try:
        # Store or update user profile
        UserStarttime = time.time()
        existing_user = db.query(User).filter_by(username=username).first()
        if existing_user:
            existing_user.profile_data = profile_data
            existing_user.updated_at = datetime.now()
        else:
            user_record = User(
                username=username,
                profile_data=profile_data
            )
            db.add(user_record)
        
        UserEndtime = time.time()
        print(f"User data stored in {UserEndtime - UserStarttime:.2f} seconds")

        start_time = time.time()

        # Efficiently handle video data updates/inserts
        video_ids = [str(video.get('id', str(uuid.uuid4()))) for video in videos_data]
        existing_videos = db.query(Video).filter(Video.video_id.in_(video_ids)).all()
        existing_video_ids = {video.video_id for video in existing_videos}

        # Prepare for bulk update and insert
        videos_to_update = []
        videos_to_insert = []

        for video in videos_data:
            video_id = str(video.get('id', str(uuid.uuid4())))
            if video_id in existing_video_ids:
                video_record = next((v for v in existing_videos if v.video_id == video_id), None)
                if video_record:
                    video_record.video_metadata = video
                    video_record.updated_at = datetime.now()
                    videos_to_update.append(video_record)
            else:
                videos_to_insert.append(
                    Video(
                        video_id=video_id,
                        username=username,
                        video_metadata=video
                    )
                )

        # Bulk insert and commit updates
        if videos_to_insert:
            db.bulk_save_objects(videos_to_insert)
        if videos_to_update:
            db.bulk_update_mappings(Video, [v.__dict__ for v in videos_to_update])

        end_time = time.time()
        print(f"Video Data stored in {end_time - start_time:.2f} seconds")

        db.commit()
        return True
    except Exception as e:
        print(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

async def store_comment(name, rating, comment):
    db = next(get_db())
    try:
        comment_record = Comment(
            name=name,
            rating=rating,
            comment=comment
        )
        db.add(comment_record)
        db.commit()
        return True
    except Exception as e:
        print(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

async def get_comments():
    db = next(get_db())
    try:
        comments = db.query(Comment).order_by(Comment.created_at.desc()).all()
        return [
            {
                "name": comment.name,
                "rating": comment.rating,
                "comment": comment.comment,
                "created_at": comment.created_at
            }
            for comment in comments
        ]
    finally:
        db.close()