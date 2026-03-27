import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Divider,
    TextField,
    List,
    ListItemButton,
    ListItemText,
    Button,
    useMediaQuery,
} from "@mui/material";
import { useColorScheme } from '@mui/material/styles';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';

import React, { useEffect, useState, useRef } from "react";

import Editor from '@monaco-editor/react';
import * as monaco from "monaco-editor";

import ky from "ky";

import { api } from "../hooks/api";
import PatternEdit from "./pattern_edit";
import { useErrorMsg } from "../components/error_popout";
import { LoadingEditor, LoadingCard } from "./loading";


interface FileName {
    name: string;
    title: string;
    creator: string;
    desc?: string;
    source?: string;
}
const BUFFER = 188;


export default function FileList({ setStep }: { setStep: (step: number) => void }) {
    // Define Value
    const { pushError } = useErrorMsg();
    const [lsFile, setLsFile] = useState<FileName[]>([]);
    const [fileSelect, setFileSelect] = useState<FileName>({ name: "", title: "", creator: "" });
    const [executing, setExecuting] = useState<boolean>(false);
    const [fileSelected, setFileSelected] = useState<number>(0);
    const [openMdaEditor, setOpenMdaEditor] = useState<boolean>(false);
    const { mode } = useColorScheme();
    const isDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [patternEditOpen, setPatternEditOpen] = useState<boolean>(false);

    const controller = useRef<AbortController | null>(null);
    const srollTimeoutRef = useRef<NodeJS.Timeout>(null);
    const orgEditor = useRef<monaco.editor.IStandaloneCodeEditor>(null);
    const mdfEditor = useRef<monaco.editor.IStandaloneCodeEditor>(null);
    const editorAPI = useRef<typeof monaco.editor>(null);


    // Function Part
    const file_read = async (filename: string) => {
        try {
            let content = "";
            const decoder = new TextDecoder("utf-8");
            const res = (await ky.get("/api/file/read", { searchParams: { filename }, timeout: false })).body?.getReader();
            while (true) {
                const { done, value } = await res?.read()!;
                if (done) break;
                content += decoder.decode(value, { stream: true });
            }
            return content;
        } catch (error) {
            pushError(error, "读取文件失败");
        }
    }

    const update_mda = (data: FileName) => {
        api.post("/api/file/update", { json: data }).json()
            .catch((error) => { pushError(error, "更新元数据失败"); })
    }


    const handleScroll = () => {
        if (!fileSelect.name) return;

        const visibleRange = (orgEditor.current?.getVisibleRanges()[0] as monaco.Range);
        const start_line = visibleRange.startLineNumber;
        const end_line = visibleRange.endLineNumber + BUFFER;

        if (controller.current) {
            controller.current.abort();
        }
        controller.current = new AbortController();

        api.get("/api/file/get", {
            searchParams: { start_line, end_line },
            signal: controller.current.signal
        }).json<Record<string, string[]>>()
            .then((data) => {
                mdfEditor.current?.getModel()?.setValue(data["content"].join("\n"));
            })
            .catch((error) => {
                if ((error as Error).name !== "AbortError") {
                    pushError(error, "获取文件内容失败");
                }
            })
        mdfEditor.current?.setScrollTop(0);
    }

    const themeSelect = () => {
        if (mode === "system") {
            return isDark ? "myvs-dark" : "myvs";
        }
        else if (mode === "dark") {
            return "myvs-dark";
        }
        else {
            return "myvs";
        }
    }


    // Fetch file list eachtime path changes.
    useEffect(() => {
        api.get("/api/file/ls").json<FileName[]>()
            .then((data) => { setLsFile(data); })
            .catch((error) => { pushError(error, "获取文件列表失败"); })
    }, []);

    useEffect(() => {
        if (!editorAPI.current) return;
        editorAPI.current.setTheme(themeSelect());
    }, [mode]);


    return (
        <>
            <PatternEdit open={patternEditOpen} setOpen={() => { setPatternEditOpen(false); handleScroll(); }} />
            {executing && <LoadingCard list={lsFile.map((f) => f.name)} path="/api/file/execute" next={() => setStep(2)} cancel={() => setExecuting(false)} />}
            <Dialog open={openMdaEditor} onClose={() => { setOpenMdaEditor(false); }} maxWidth={false}>
                <DialogTitle>编辑作品元数据: {fileSelect.name}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {[["title", "标题"], ["creator", "作者"], ["desc", "描述"], ["source", "来源"]].map(([key, label]) => (
                            <TextField
                                key={key}
                                label={label}
                                value={fileSelect[key as keyof FileName]}
                                required={key === "title"}
                                onChange={(e) => {
                                    setFileSelect({ ...fileSelect, [key]: e.target.value });
                                }}
                                multiline={key === "desc"}
                                sx={{ width: '60vw' }}
                            />
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenMdaEditor(false);
                        setFileSelect(lsFile.find((item) => item.name === fileSelect.name) ?? { name: "", title: "", creator: "" });
                    }} variant="outlined">取消</Button>
                    <Button onClick={() => {
                        setOpenMdaEditor(false);
                        update_mda(fileSelect);
                        setLsFile((prev) => prev.map((item) => item.name === fileSelect.name ? fileSelect : item));
                    }} variant="contained">确定</Button>
                </DialogActions>
            </Dialog>
            <List sx={{ minWidth: 188, maxWidth: 188, overflow: "auto", height: '100%' }}>
                {lsFile.map((item) => (
                    <React.Fragment key={item.name}>
                        <ListItemButton
                            onClick={() => {
                                setFileSelected(1);
                                setFileSelect(item);
                            }}
                        >
                            <ListItemText primary={item.name} secondary={
                                <>
                                    标题: {item.title}
                                    <br />
                                    作者: {item.creator}
                                </>
                            } />
                        </ListItemButton>
                        <Divider variant="middle" />
                    </React.Fragment>
                ))}
            </List>
            <Divider orientation="vertical" flexItem />
            <Box sx={{
                width: 'calc(100% - 188px)', height: '100%',
                display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column',
            }}>
                {fileSelected < 2 && <LoadingEditor text={fileSelected === 0 ? "请选择一个文件进行编辑" : ""} />}
                <>
                    <Box sx={{ display: 'flex', gap: 3, width: '100%', justifyContent: 'space-between', alignItems: 'center', px: 3, my: 1 }}>
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <TextField
                                size="small"
                                label={"name"}
                                variant="outlined"
                                value={fileSelect.name}
                                disabled
                            />
                            {[["标题", "title"], ["作者", "creator"]].map(([label, key]) => (
                                <TextField
                                    key={key}
                                    size="small"
                                    label={label}
                                    variant="outlined"
                                    value={fileSelect[key as keyof FileName]}
                                    required={key === "title"}
                                    onChange={(e) => {
                                        setFileSelect({ ...fileSelect, [key]: e.target.value });
                                        if (e.target.value) {
                                            update_mda({ ...fileSelect, [key]: e.target.value });
                                            setLsFile((prev) => prev.map((item) => item.name === fileSelect.name ? { ...item, [key]: e.target.value } : item));
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Box sx={{ display: 'flex', gap: 3 }}>
                            <Button
                                variant="outlined"
                                startIcon={<SettingsRoundedIcon />}
                                sx={{ gap: 1 }}
                                onClick={() => setPatternEditOpen(true)}
                            >
                                编辑格式
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<EditRoundedIcon />}
                                sx={{ gap: 1 }}
                                onClick={() => setOpenMdaEditor(true)}
                            >
                                编辑元数据
                            </Button>
                        </Box>
                        <Divider orientation="vertical" flexItem />
                        <Button
                            variant="contained"
                            startIcon={<DoneAllRoundedIcon />}
                            sx={{ gap: 1 }}
                            onClick={() => setExecuting(true)}
                        >
                            开始格式化
                        </Button>
                    </Box>
                    <Box key={fileSelect.name} sx={{
                        width: "100%",
                        height: "100%",
                        flexDirection: 'row',
                        display: 'flex',
                    }}>
                        <Editor
                            height="100%"
                            width="50%"
                            language="text"
                            theme={themeSelect()}
                            options={{
                                readOnly: true,
                                wordWrap: "on",
                                lineNumbers: "on",
                                smoothScrolling: true,
                                scrollBeyondLastLine: false,
                                minimap: { enabled: false },
                                renderLineHighlight: "none",
                                renderWhitespace: "none",
                                lineNumbersMinChars: 3,
                                mouseWheelZoom: false,
                                unicodeHighlight: {
                                    nonBasicASCII: false,
                                    ambiguousCharacters: false,
                                    invisibleCharacters: false,
                                },
                                automaticLayout: true,
                            }}
                            onMount={(editor, api) => {
                                orgEditor.current = editor;

                                api.languages.register({ id: 'clearDiff' });
                                api.languages.setMonarchTokensProvider('clearDiff', {
                                    defaultToken: 'text',
                                    tokenizer: {
                                        root: [
                                            // # 开头的行
                                            [/^#{1,2} .*$/, 'hashLine'],
                                            // <div 开头的行
                                            [/^<div.*$/, 'divLine'],
                                            // 其他默认
                                            [/.+/, 'text'],
                                        ],
                                    },
                                });
                                api.editor.defineTheme('myvs', {
                                    base: 'vs',
                                    inherit: true,
                                    rules: [
                                        { token: 'hashLine', foreground: '81D8D0', fontStyle: 'bold' },
                                        { token: 'divLine', foreground: '33FFD6', fontStyle: 'bold italic' },
                                    ],
                                    colors: {},
                                });
                                api.editor.defineTheme('myvs-dark', {
                                    base: 'vs-dark',
                                    inherit: true,
                                    rules: [
                                        { token: 'hashLine', foreground: 'F8CDCD', fontStyle: 'bold' },
                                        { token: 'divLine', foreground: '33FFD6', fontStyle: 'bold italic' },
                                    ],
                                    colors: {},
                                });

                                if (fileSelect.name) {
                                    file_read(fileSelect.name)
                                        .then((data) => {
                                            editor.setModel(api.editor.createModel(data, "text/plain"));
                                            setFileSelected(2);
                                            handleScroll();
                                        })
                                }

                                editor.onDidScrollChange(() => {
                                    if (srollTimeoutRef.current) {
                                        clearTimeout(srollTimeoutRef.current);
                                    }
                                    srollTimeoutRef.current = setTimeout(() => handleScroll(), 300);
                                });
                            }}
                        />
                        <Editor
                            height="100%"
                            width="50%"
                            language="clearDiff"
                            theme={themeSelect()}
                            options={{
                                readOnly: true,
                                wordWrap: "on",
                                lineNumbers: "off",
                                smoothScrolling: true,
                                scrollBeyondLastLine: false,
                                minimap: { enabled: false },
                                unicodeHighlight: {
                                    nonBasicASCII: false,
                                    ambiguousCharacters: false,
                                    invisibleCharacters: false,
                                },
                                mouseWheelZoom: false,
                                automaticLayout: true,
                            }}
                            onMount={(editor, api) => {
                                mdfEditor.current = editor;
                                editorAPI.current = api.editor;
                                editor.setModel(api.editor.createModel("", "clearDiff"));
                            }}
                        />
                    </Box>
                </>
            </Box>
        </>
    );
};