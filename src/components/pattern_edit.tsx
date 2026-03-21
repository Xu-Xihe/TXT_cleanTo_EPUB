import React, { useEffect, useState } from "react";

import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Box,
    Button,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Collapse,
    TableContainer,
    Paper,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    TextField,
    Tooltip,
    Checkbox,
    IconButton,
} from "@mui/material";
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded';
import TextSnippetRoundedIcon from '@mui/icons-material/TextSnippetRounded';
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import SettingsBackupRestoreRoundedIcon from '@mui/icons-material/SettingsBackupRestoreRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import FeaturedVideoRoundedIcon from '@mui/icons-material/FeaturedVideoRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';

import { api } from "../hooks/api";
import { useErrorMsg } from "../components/error_popout";

import type { JSX } from "react";


interface PatternEditProps {
    enable: boolean,
    alias: string,
    pattern: string,
}


export default function PatternEdit({ open, setOpen }: { open: boolean, setOpen: (para: boolean) => void }) {
    const [filePattern, setFilePattern] = useState<PatternEditProps[]>([]);
    const [chapterPattern, setChapterPattern] = useState<PatternEditProps[]>([]);
    const [advPattern, setAdvPattern] = useState<PatternEditProps[]>([]);
    const [volumePattern, setVolumePattern] = useState<PatternEditProps[]>([]);
    const [extendType, setExtendType] = useState<number>(0);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [tempPattern, setTempPattern] = useState<PatternEditProps>({ enable: true, alias: "", pattern: "" });
    const { pushMsg } = useErrorMsg();


    const patternTypeMap: [string, React.Dispatch<React.SetStateAction<PatternEditProps[]>>][] = [
        ["file", setFilePattern],
        ["chapter", setChapterPattern],
        ["volume", setVolumePattern],
        ["adv", setAdvPattern],
    ];

    // Function Part
    const fetch = (id: string) => {
        patternTypeMap.map(([type, set]) => {
            if (id === "" || id === type) {
                api.get(`/api/pattern/${type}`).json<PatternEditProps[]>()
                    .then((data) => {
                        set(data)
                    })
                    .catch((error) => { pushMsg(`Failed to fetch ${type} pattern: ` + error) })
            }
        })
    }

    const update = (type: string, p: PatternEditProps, old_alias: string) => {
        if (old_alias === "") {
            api.get(`/api/pattern/${type}/delete`, { searchParams: { "alias": p.alias } })
                .then(() => { fetch(type); })
                .catch((error) => {
                    fetch(type);
                    pushMsg("Failed to delete pattern: " + error);
                })
        }
        else {
            api.post(`/api/pattern/${type}/update`, { json: p, searchParams: { old_alias } })
                .catch((error) => { pushMsg("Failed to update pattern: " + error); })
        }
        fetch(type);
    }

    const reset = (type: string) => {
        api.get(`/api/pattern/${type}/reset`)
            .then(() => { fetch(type); })
            .catch((error) => { pushMsg((error as Error).message); })
    }

    // useEffect Part

    // Fetch pattern when open changed
    useEffect(() => {
        if (open) {
            fetch("");
        }
    }, [open]);

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth={false}
            slotProps={{
                paper: {
                    sx: {
                        overflow: "visible",
                        maxHeight: "none"
                    }
                }
            }}
        >
            <DialogTitle>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography variant="h6" color="textPrimary">编辑匹配格式</Typography>
                        {extendType === 0 ? null :
                            <Box sx={{ ml: 3, display: "flex", gap: 1 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<AddRoundedIcon />}
                                    onClick={() => {
                                        patternTypeMap[extendType - 1][1]
                                            (prev => [{ enable: true, alias: "新建格式", pattern: "{title}" }, ...prev]);
                                        setTempPattern({ enable: true, alias: "新建格式", pattern: "{title}" });
                                        setEditingIndex(0);
                                    }}
                                    disabled={editingIndex !== -1}
                                >
                                    新建
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<SettingsBackupRestoreRoundedIcon />}
                                    onClick={() => reset(patternTypeMap[extendType - 1][0])}
                                    disabled={editingIndex !== -1}
                                >
                                    重置
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<SyncRoundedIcon />}
                                    onClick={() => fetch("")}
                                >
                                    刷新
                                </Button>
                            </Box>
                        }
                    </Box>
                    <IconButton sx={{ borderRadius: 2 }} onClick={() => setOpen(false)}>
                        <CloseRoundedIcon />
                    </IconButton>
                </Box>
            </DialogTitle>
            <DialogContent sx={{
                display: "flex",
                overflow: "visible",
                flexDirection: "column",
                maxHeight: '68vh',
                gap: 2,
                m: 3,
            }}>
                <List
                    sx={{ width: '68vw' }}>
                    {[
                        [1, "File", <InsertDriveFileRoundedIcon />, filePattern],
                        [2, "Chapter", <TextSnippetRoundedIcon />, chapterPattern],
                        [3, "Volume", <TextSnippetRoundedIcon />, volumePattern],
                        [4, "Adv", <FeaturedVideoRoundedIcon />, advPattern],
                    ].map(([index, type, Icon, patternList]) => (
                        <React.Fragment key={(index as number)}>
                            <ListItemButton disabled={editingIndex !== -1} onClick={() => setExtendType(extendType === (index as number) ? 0 : (index as number))}>
                                <ListItemIcon>
                                    {Icon as JSX.Element}
                                </ListItemIcon>
                                <ListItemText primary={type + " Pattern"} />
                                {extendType === (index as number) ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
                            </ListItemButton>
                            <Collapse in={extendType === (index as number)} timeout="auto" unmountOnExit >
                                <TableContainer component={Paper} sx={{ maxHeight: "46vh", overflow: "auto" }}>
                                    <Table sx={{ minWidth: 650, overflow: "auto" }} aria-label="simple table" stickyHeader>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell align="center">启用</TableCell>
                                                <TableCell align="center">标签</TableCell>
                                                <TableCell align="center">格式</TableCell>
                                                <TableCell align="center">示例</TableCell>
                                                <TableCell align="center">操作</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(patternList as PatternEditProps[]).map((item, i) => (
                                                <TableRow key={item.alias}>
                                                    <TableCell align="center" sx={{ width: 60 }}>
                                                        <Checkbox
                                                            checked={item.enable}
                                                            onChange={(event) => {
                                                                update((type as string).toLowerCase(), { ...item, enable: event.target.checked }, item.alias);
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center" sx={{ width: 308 }}>{
                                                        i === editingIndex ?
                                                            <TextField
                                                                variant="outlined"
                                                                onChange={(event) => setTempPattern({ ...tempPattern, alias: event.target.value })}
                                                                defaultValue={tempPattern.alias}
                                                            />
                                                            :
                                                            item.alias
                                                    }</TableCell>
                                                    <TableCell align="center" sx={{ width: 308 }}>{
                                                        i === editingIndex ?
                                                            <Tooltip title={<>
                                                                通配符：
                                                                <br />
                                                                {index === 1 &&
                                                                    <>
                                                                        {"{title}: 小说标题"}
                                                                        <br />
                                                                        {"{creator}: 作者"}
                                                                    </>
                                                                }
                                                                {index === 2 &&
                                                                    <>
                                                                        {"{title}: 章节标题"}
                                                                        <br />
                                                                        {"{chapter}: 正文章节序号 支持中文+数字 显示为第x章"}
                                                                        <br />
                                                                        {"{extchapter}: 番外序号 支持中文+数字 显示为番外x"}
                                                                    </>
                                                                }
                                                                {index === 3 &&
                                                                    <>
                                                                        {"{title}: 卷标题"}
                                                                        <br />
                                                                        {"{chapter}: 卷序号 支持中文+数字"}
                                                                    </>
                                                                }
                                                                <br />
                                                                {"{n}: 任意长度数字"}
                                                                <br />
                                                                {"{n}: 任意长度英文"}
                                                                <br />
                                                                {"{s}: 任意长度任意字符 包括空白符"}
                                                            </>}>
                                                                <TextField
                                                                    variant="outlined"
                                                                    onChange={(event) => setTempPattern({ ...tempPattern, pattern: event.target.value })}
                                                                    defaultValue={tempPattern.pattern}
                                                                />
                                                            </Tooltip>
                                                            :
                                                            item.pattern
                                                    }</TableCell>
                                                    <TableCell align="center">{
                                                        (i === editingIndex ? tempPattern.pattern : item.pattern)
                                                            .replaceAll("{title}", "我是你爸爸")
                                                            .replaceAll("{creator}", "ytq是谁")
                                                            .replaceAll("{chapter}", "8")
                                                            .replaceAll("{n}", "123")
                                                            .replaceAll("{e}", "abc")
                                                            .replaceAll("{c}", "阿弥陀佛")
                                                            .replaceAll("{s}", "Trump搓澡喽")
                                                    }</TableCell>
                                                    <TableCell align="center">
                                                        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
                                                            {i === editingIndex ?
                                                                <>
                                                                    <Paper elevation={3}>
                                                                        <IconButton
                                                                            sx={{ borderRadius: 2 }}
                                                                            onClick={() => {
                                                                                update((type as string).toLowerCase(), tempPattern, item.alias);
                                                                                setEditingIndex(-1);
                                                                            }}
                                                                        >
                                                                            <DoneAllRoundedIcon />
                                                                        </IconButton>
                                                                    </Paper>
                                                                    <Paper elevation={3}>
                                                                        <IconButton
                                                                            sx={{ borderRadius: 2 }}
                                                                            onClick={() => {
                                                                                if (item.alias === "新建格式") {
                                                                                    patternTypeMap[extendType - 1][1]
                                                                                        (prev => prev.filter((_, index) => index !== 0));
                                                                                }
                                                                                setEditingIndex(-1);
                                                                            }}
                                                                        >
                                                                            <CloseRoundedIcon />
                                                                        </IconButton>
                                                                    </Paper>
                                                                </>
                                                                :
                                                                <>
                                                                    <IconButton
                                                                        onClick={() => { setEditingIndex(i), setTempPattern({ enable: item.enable, alias: item.alias, pattern: item.pattern }) }}
                                                                        disabled={editingIndex !== -1}
                                                                    >
                                                                        <EditRoundedIcon />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        onClick={() => { update((type as string).toLowerCase(), { enable: false, alias: item.alias, pattern: "" }, ""); }}
                                                                        disabled={editingIndex !== -1}
                                                                    >
                                                                        <DeleteIcon />
                                                                    </IconButton>
                                                                </>
                                                            }
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Collapse>
                        </React.Fragment>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
            </DialogActions>
        </Dialog >
    );
}