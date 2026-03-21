import aiofiles
import re

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from api.path import PathOpr
from api.pattern import pattern


class FileInfo(BaseModel):
    name: str
    title: str
    creator: str = ""
    temp_name: str = ""
    desc: str = ""
    source: str = ""


class Cursor(BaseModel):
    """
    Start at 1.
    """

    start_line: int
    end_line: int


class ExecuteResponse(BaseModel):
    filename: str
    progress: float
    error: str | None = None


class FileOpr:
    _content: list[str] = []
    _file: list[FileInfo] = []
    _is_empty = False

    @classmethod
    async def ls_file(cls) -> list[FileInfo]:
        if PathOpr._need_update:
            cls._file.clear()
            name = [
                i.name
                for i in PathOpr._path.iterdir()
                if i.is_file() and str(i.name)[0] != "." and i.suffix == ".txt"
            ]
            name.sort()
            for i in name:
                pt = await pattern.match("file", i.replace(".txt", ""))
                cls._file.append(
                    FileInfo(
                        name=i,
                        title=pt.get("title", i.replace(".txt", "")),
                        creator=pt.get("creator", ""),
                    )
                )
        return cls._file

    @classmethod
    async def read(cls, filename: str):
        isEncode = False
        for encoding in ("utf-8", "gbk"):
            cls._content.clear()
            try:
                async with aiofiles.open(
                    PathOpr._path / filename, mode="r", encoding=encoding
                ) as f:
                    async for line in f:
                        yield line
                        print(f"read line: {line}")
                        cls._content.append(line.rstrip())

            except UnicodeDecodeError:
                continue
            else:
                isEncode = True
                break
        if not isEncode:
            raise Exception("Cannot decode file with utf-8 or gbk")

    @classmethod
    async def _match_line(cls, line: str) -> str | None:
        if line.strip() == "":
            if not cls._is_empty:
                cls._is_empty = True
                return ""
            else:
                return None

        elif await pattern.match("adv", line):
            return None

        elif re.match(r"^\s*[-=－＝—–─]{3,}\s*$", line):
            cls._is_empty = True
            return '<div class="separator"></div>'

        elif pt := await pattern.match("volume", line):
            sline = ""
            if not cls._is_empty:
                sline += "\n"

            sline += "# "

            if pt.get("chapter"):
                sline += f"第{await pattern._int_to_chinese(pt['chapter'])}卷"

            if pt.get("chapter") and pt.get("title"):
                sline += " "

            if pt.get("title"):
                sline += f"{pt['title']}"

            cls._is_empty = True
            return sline + "\n"

        elif pt := await pattern.match("chapter", line):
            sline = ""

            if not cls._is_empty:
                sline += "\n"

            sline += "## "

            if pt.get("chapter"):
                sline += f"第{pt[('chapter')]}章"

            elif pt.get("extchapter"):
                sline += f"番外{pt['extchapter']}"

            if (pt.get("chapter") or pt.get("extchapter")) and pt.get("title"):
                sline += " "

            if pt.get("title"):
                sline += f"{pt['title']}"

            cls._is_empty = True
            return sline + "\n"

        elif line.startswith(" ") or line.startswith("\t") or line.startswith("　"):
            if cls._is_empty:
                cls._is_empty = False
                return line.strip()
            else:
                return "\n" + line.strip()

        else:
            cls._is_empty = False
            return line.strip()

    @classmethod
    async def get(cls, cursor: Cursor) -> dict[str, list[str]]:
        if not cls._content:
            raise Exception("No file is read.")

        format_out: list[str] = []
        if cursor.end_line > len(cls._content):
            cursor.end_line = len(cls._content)

        cls._is_empty = False
        for i in range(cursor.start_line - 1, cursor.end_line):
            data = await cls._match_line(cls._content[i])
            print(f"line {i+1}: {cls._content[i]} -> {data}")
            if data is not None:
                format_out.append(data)

        return {
            "content": format_out,
        }

    @classmethod
    async def update_metadata(cls, data: FileInfo):
        for i in range(len(cls._file)):
            if cls._file[i].name == data.name:
                cls._file[i] = data
                return

        raise Exception("Cannot find file name in list.")

    @classmethod
    async def execute(cls):
        # Initialization
        cls._content.clear()
        for i in PathOpr._temp_path.iterdir():
            if i.is_file():
                i.unlink()

        # Execute
        for i in range(len(cls._file)):
            cls._file[i].temp_name = (
                f"{cls._file[i].title}{"_" + cls._file[i].creator if cls._file[i].creator else ''}.txt"
            )
            isEncode = False
            for encoding in ("utf-8", "gbk", "utf-8-sig"):
                try:
                    # Statistics
                    total_size = (PathOpr._path / cls._file[i].name).stat().st_size
                    current_size = 0
                    last_progress = 0.0

                    # Generate suffix content
                    content = f"---\ntitle: {cls._file[i].title}\nauthor: {cls._file[i].creator}\nlanguage: zh-cn\n"
                    content += f"desc: |\n"
                    for line in cls._file[i].desc.splitlines():
                        content += f"  {line.lstrip()}\n"
                    content += f"source: {cls._file[i].source}\n---\n\n"

                    # Read file and process line by line
                    async with aiofiles.open(
                        PathOpr._path / cls._file[i].name, mode="r", encoding=encoding
                    ) as fr:
                        async for line in fr:
                            if (current_size / total_size) - last_progress >= 0.015:
                                last_progress = current_size / total_size
                                yield ExecuteResponse(
                                    filename=cls._file[i].name,
                                    progress=round(last_progress, 2),
                                )
                            data = await cls._match_line(line.rstrip("\n"))
                            current_size += len(line.encode(encoding))
                            if data is not None:
                                content += data + "\n"

                    async with aiofiles.open(
                        PathOpr._temp_path / cls._file[i].temp_name,
                        mode="w",
                        encoding="utf-8",
                    ) as fw:
                        await fw.write(content)

                except UnicodeDecodeError:
                    continue
                else:
                    isEncode = True
                    break
            if not isEncode:
                yield ExecuteResponse(
                    filename=cls._file[i].name,
                    progress=0.01,
                    error=f"Execute file {cls._file[i].name}: Cannot decode file with utf-8 or gbk",
                )
                cls._file[i].temp_name = ""

            else:
                yield ExecuteResponse(
                    filename=cls._file[i].name,
                    progress=1.0,
                    error="",
                )


file_router = APIRouter(prefix="/file", tags=["file"])


@file_router.get("/ls", response_model=list[FileInfo])
async def ls_file():
    """
    List the txt files in the specified path.
    """
    try:
        return await FileOpr.ls_file()
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@file_router.post("/update", response_model=None)
async def updata(data: FileInfo):
    try:
        await FileOpr.update_metadata(data)
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@file_router.get("/read")
async def read(filename: str = Query(..., description="The file name to read.")):
    try:

        async def progress_stream():
            async for resp in FileOpr.read(filename):
                yield resp.encode("utf-8")

        return StreamingResponse(
            progress_stream(), media_type="text/plain; charset=utf-8"
        )
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@file_router.get("/get", response_model=dict[str, list[str]])
async def get(
    start_line: int = Query(
        ..., description="The start line number of the visible area."
    ),
    end_line: int = Query(..., description="The end line number of the visible area."),
):
    try:
        return await FileOpr.get(Cursor(start_line=start_line, end_line=end_line))
    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))


@file_router.post("/execute", response_model=ExecuteResponse | None)
async def execute():
    try:

        async def progress_stream():
            async for resp in FileOpr.execute():
                yield resp.model_dump_json().encode("utf-8") + b"\n"

        return StreamingResponse(progress_stream(), media_type="application/json")

    except Exception as e:
        print(str(e))
        raise HTTPException(status_code=400, detail=str(e))
