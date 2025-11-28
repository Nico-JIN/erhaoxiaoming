"""MinIO storage helper."""

import uuid
from datetime import timedelta
from typing import BinaryIO, Iterator, Optional, Tuple

from minio import Minio
from minio.error import S3Error

from backend.app.core.config import get_settings


settings = get_settings()


class MinIOStorage:
    """Wrapper around MinIO client with basic helpers."""

    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        try:
            if not self.client.bucket_exists(settings.MINIO_BUCKET):
                self.client.make_bucket(settings.MINIO_BUCKET)
        except S3Error as exc:
            print(f"Error creating bucket: {exc}")

    @staticmethod
    def _sanitize_object_name(object_name: str) -> str:
        cleaned = object_name.strip().lstrip("/\\")
        if ".." in cleaned:
            raise ValueError("Invalid object path")
        return cleaned

    def _generate_object_name(self, filename: str, prefix: Optional[str] = None) -> str:
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        unique = str(uuid.uuid4())
        if ext:
            unique = f"{unique}.{ext}"
        if prefix:
            prefix = prefix.strip("/ ")
            if prefix:
                unique = f"{prefix}/{unique}"
        return unique

    def upload_file(
        self,
        file: BinaryIO,
        filename: str,
        content_type: Optional[str] = None,
        length: Optional[int] = None,
        prefix: Optional[str] = None,
    ) -> str:
        """Upload file to MinIO and return the object name."""

        try:
            object_name = self._generate_object_name(filename, prefix)

            if length is None or length <= 0:
                current = file.tell()
                file.seek(0, 2)
                length = file.tell()
                file.seek(current)

            if not length or length <= 0:
                raise ValueError("File length must be greater than zero")

            file.seek(0)
            self.client.put_object(
                settings.MINIO_BUCKET,
                object_name,
                file,
                length=length,
                part_size=10 * 1024 * 1024,
                content_type=content_type,
            )

            return object_name
        except (S3Error, ValueError) as exc:
            raise Exception(f"Error uploading file: {exc}") from exc

    def get_file_url(self, object_name: str, expires: int = 3600) -> str:
        """Return a presigned download URL."""

        try:
            safe_name = self._sanitize_object_name(object_name)
            # MinIO expects timedelta object, not integer seconds
            expires_delta = timedelta(seconds=expires)
            return self.client.presigned_get_object(
                settings.MINIO_BUCKET,
                safe_name,
                expires=expires_delta,
            )
        except S3Error as exc:
            raise Exception(f"Error generating file URL: {exc}") from exc

    def delete_file(self, object_name: str) -> None:
        """Delete an object from MinIO."""

        try:
            safe_name = self._sanitize_object_name(object_name)
            self.client.remove_object(settings.MINIO_BUCKET, safe_name)
        except S3Error as exc:
            raise Exception(f"Error deleting file: {exc}") from exc

    def get_file(self, object_name: str) -> bytes:
        """Return the raw bytes for a stored object."""

        try:
            safe_name = self._sanitize_object_name(object_name)
            response = self.client.get_object(settings.MINIO_BUCKET, safe_name)
            data = response.read()
            response.close()
            response.release_conn()
            return data
        except S3Error as exc:
            raise Exception(f"Error retrieving file: {exc}") from exc

    def stream_file(
        self, object_name: str, chunk_size: int = 1024 * 1024
    ) -> Tuple[Optional[str], Iterator[bytes]]:
        """Stream a stored object without loading it fully into memory."""

        safe_name = self._sanitize_object_name(object_name)
        try:
            response = self.client.get_object(settings.MINIO_BUCKET, safe_name)
        except S3Error as exc:
            raise Exception(f"Error retrieving file: {exc}") from exc

        content_type = response.headers.get("content-type")

        def iterator() -> Iterator[bytes]:
            try:
                for data in response.stream(chunk_size):
                    yield data
            finally:
                response.close()
                response.release_conn()

        return content_type, iterator()


storage = MinIOStorage()
