import aiofiles
import asyncio

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pathlib import Path
from pydantic import BaseModel
from pypandoc import convert_file as pd_convert

from api.path import PathOpr
from api.file import FileInfo, FileOpr, ExecuteResponse


class TranConfig(BaseModel):
    save_txt: bool = False
    del_origin: bool = False


class TranOpr:
    _files = []

    @classmethod
    async def ls(cls) -> list[FileInfo]:
        cls._files = [i for i in FileOpr._file if i.temp_name]
        return cls._files

    @staticmethod
    async def get(oldname: str) -> dict[str, str]:
        filename = next((f for f in FileOpr._file if f.name == oldname), None)
        if not filename:
            raise Exception("File not found")
        for encoding in ("utf-8", "gbk"):
            try:
                async with aiofiles.open(
                    PathOpr._temp_path / filename.temp_name,
                    mode="r",
                    encoding="utf-8",
                    errors="replace",
                ) as fmdf, aiofiles.open(
                    PathOpr._path / filename.name, mode="r", encoding=encoding
                ) as forg:
                    return {"format": await fmdf.read(), "origin": await forg.read()}
            except UnicodeDecodeError:
                continue
        raise Exception("Failed to read file with utf-8 and gbk encoding")

    @staticmethod
    async def set(oldname: str, content: str):
        filename = next((f for f in FileOpr._file if f.name == oldname), None)
        if not filename:
            raise Exception("File not found")
        async with aiofiles.open(
            PathOpr._temp_path / filename.temp_name,
            mode="w",
            encoding="utf-8",
        ) as fmdf:
            await fmdf.write(content)

    @classmethod
    async def execute(cls, config: TranConfig):
        for f in cls._files:
            yield ExecuteResponse(filename=f.name, progress=0.0, error="")
            path = (
                PathOpr._path
                / "Output"
                / f.temp_name.replace(".txt", "")
                / f.temp_name.replace(".txt", ".epub")
            )
            path.parent.mkdir(parents=True, exist_ok=True)
            yield ExecuteResponse(filename=f.name, progress=0.3, error="")
            try:
                await asyncio.to_thread(
                    pd_convert,
                    str(PathOpr._temp_path / f.temp_name),
                    "epub",
                    format="markdown",
                    outputfile=str(path.resolve()),
                    extra_args=[
                        f"--css={str((Path(__file__).parent / 'epub.css').resolve())}",
                    ],
                )
            except Exception as e:
                yield ExecuteResponse(filename=f.name, progress=0.1, error=str(e))
                continue
            else:
                yield ExecuteResponse(filename=f.name, progress=0.9, error="")
                try:
                    if config.save_txt:
                        (PathOpr._temp_path / f.temp_name).move(
                            path.parent / "Output" / f.temp_name
                        )
                    if config.del_origin:
                        (PathOpr._path / f.name).unlink()
                except Exception as e:
                    yield ExecuteResponse(filename=f.name, progress=1.0, error=str(e))
                    continue
                else:
                    yield ExecuteResponse(filename=f.name, progress=1.0, error="")


tran_router = APIRouter(prefix="/tran", tags=["tran"])


@tran_router.get("/ls", response_model=list[FileInfo])
async def ls():
    try:
        return await TranOpr.ls()
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@tran_router.get("/get", response_model=dict[str, str])
async def get(oldname: str = Query(..., description="The original filename.")):
    try:
        return await TranOpr.get(oldname)
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


class setFetchModel(BaseModel):
    content: str


@tran_router.post("/set", response_model=None)
async def set(
    content: setFetchModel,
    oldname: str = Query(..., description="The original filename."),
):
    try:
        await TranOpr.set(oldname, content.content)
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@tran_router.post("/execute", response_model=ExecuteResponse)
async def execute(config: TranConfig):
    try:

        async def progress_stream():
            async for resp in TranOpr.execute(config):
                yield resp.model_dump_json().encode("utf-8") + b"\n"

        return StreamingResponse(progress_stream(), media_type="application/json")

    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))
