import {
    Box,
    Button,
    useMediaQuery,
    List,
    ListItemButton,
    ListItemText,
    TextField,
    Divider,
    FormGroup,
    FormControlLabel,
    Switch,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
} from "@mui/material";
import { useColorScheme } from '@mui/material/styles';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';

import { useEffect, useState, useRef } from "react";

import { DiffEditor } from '@monaco-editor/react';
import type * as monaco from "monaco-editor";

import { api } from "../hooks/api";
import { useErrorMsg } from "./error_popout";
import { LoadingEditor, LoadingFullScreen } from "./loading";


interface FileName {
    name: string;
    title: string;
    creator: string;
    temp_name: string;
}


export default function FileConfirm({ setStep }: { setStep: (step: number) => void }) {
    // Define Value
    const { pushError } = useErrorMsg();
    const { mode } = useColorScheme();
    const isDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [lsFile, setLsFile] = useState<FileName[]>([]);
    const [diffMode, setDiffMode] = useState<boolean>(true);
    const [fileSelect, setFileSelect] = useState<FileName>({ name: "", title: "", creator: "", temp_name: "" });
    const diffEditor = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
    const editorAPI = useRef<typeof monaco.editor>(null);
    const [refreshEditor, setRefreshEditor] = useState<number>(0);
    const [isSaved, setIsSaved] = useState<boolean>(true);
    const [saveConfirmOpen, setSaveConfirmOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<number>(1);
    const continueRef = useRef<(value: boolean) => void>((_) => { });



    // Functions
    const fetchContent = async (file: FileName) => {
        try {
            const data = await api.get("/api/tran/get",
                { searchParams: { oldname: file.name } })
                .json<Record<string, string>>();
            return data;
        }
        catch (error) {
            pushError(error, "获取文件内容失败");
        }
    };

    const waitForSaveConfirm = () => new Promise<boolean>((resolve) => {
        setSaveConfirmOpen(true);
        continueRef.current = resolve;
    });

    const setContent = (file: FileName) => {
        api.post("/api/tran/set",
            {
                json: { content: diffEditor.current?.getModifiedEditor().getValue() },
                searchParams: { oldname: file.name }
            })
            .then(() => {
                setIsSaved(true);
            })
            .catch((error) => {
                pushError(error, "保存文件内容失败");
            });
    };


    // Effects
    useEffect(() => {
        api.get("/api/tran/ls").json<FileName[]>()
            .then((data) => setLsFile(data))
            .catch((error) => pushError(error, "获取文件列表失败"));
    }, []);


    useEffect(() => {
        if (diffMode) {
            diffEditor.current?.updateOptions({
                renderSideBySide: true,
                renderIndicators: true,
            });
        }
        else {
            diffEditor.current?.updateOptions({
                renderSideBySide: false,
                renderIndicators: false,
            });
        }
    }, [diffMode]);

    useEffect(() => {
        if (!editorAPI.current) return;
        if (mode === "system") {
            editorAPI.current?.setTheme(isDark ? "myvs-dark" : "myvs");
        }
        else if (mode === "dark") {
            editorAPI.current?.setTheme("myvs-dark");
        }
        else {
            editorAPI.current?.setTheme("myvs");
        }
    }, [mode, fileSelect]);



    // Components
    const unSavedConfirm = () => (
        <Dialog
            open={saveConfirmOpen}
            onClose={() => {
                setSaveConfirmOpen(false);
                continueRef.current?.(false);
            }}
        >
            <DialogTitle>未保存的更改</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    您有未保存的更改。是否要忽略更改并继续？
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setSaveConfirmOpen(false)}>取消</Button>
                <Button onClick={() => {
                    setIsSaved(true);
                    continueRef.current?.(true);
                    setSaveConfirmOpen(false);
                }} autoFocus>
                    忽略并继续
                </Button>
            </DialogActions>
        </Dialog>
    );


    return (
        <>
            {unSavedConfirm()}
            <List sx={{ minWidth: 188, maxWidth: 188, overflow: "auto", height: '100%' }}>
                {lsFile.map((item) => (
                    <>
                        <ListItemButton
                            key={item.name}
                            onClick={async () => {
                                if (!isSaved) {
                                    const ok = await waitForSaveConfirm();
                                    if (!ok) {
                                        return;
                                    }
                                }
                                setIsLoading(1);
                                setIsSaved(true);
                                setFileSelect(item);
                                setRefreshEditor(Date.now());
                            }}
                        >
                            <ListItemText primary={item.temp_name} />
                        </ListItemButton>
                        <Divider variant="middle" />
                    </>
                ))}
            </List>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
                <Box sx={{ display: 'flex', gap: 3, width: '100%', justifyContent: 'space-between', alignItems: 'center', px: 3, my: 1 }}>
                    <Box sx={{ display: 'flex', gap: 3, width: '50%' }}>
                        {[["新文件名", "temp_name"], ["旧文件名", "name"], ["标题", "title"], ["作者", "creator"]].map(([label, key]) => (
                            <TextField
                                key={key}
                                size="small"
                                label={label}
                                variant="outlined"
                                value={fileSelect[key as keyof FileName]}
                                disabled
                            />
                        ))}
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ display: 'flex', gap: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<SyncRoundedIcon />}
                            sx={{ gap: 1 }}
                            onClick={() => setRefreshEditor(Date.now())}
                        >
                            刷新
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SaveRoundedIcon />}
                            sx={{ gap: 1 }}
                            disabled={isSaved}
                            onClick={() => {
                                setContent(fileSelect);
                                setIsSaved(true);
                            }}
                        >
                            保存
                        </Button>
                        <FormGroup>
                            <FormControlLabel control={
                                <Switch
                                    checked={diffMode}
                                    onChange={(e) => { setDiffMode(e.target.checked); }}
                                />
                            } label="diff模式" />
                        </FormGroup>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Button
                        variant="contained"
                        startIcon={<DoneAllRoundedIcon />}
                        sx={{ gap: 1 }}
                        onClick={async () => {
                            setIsLoading(2);
                            if (!isSaved) {
                                const ok = await waitForSaveConfirm();
                                if (!ok) {
                                    return;
                                }
                            }
                            setStep(3);
                        }}
                    >
                        下一步
                    </Button>
                </Box>
                <Divider />
                {isLoading == 1 && <LoadingEditor text={fileSelect.name === "" ? "选择文件以开始编辑" : ""} />}
                {isLoading == 2 && <LoadingFullScreen />}
                <DiffEditor
                    key={refreshEditor}
                    theme={isDark ? "vs-dark" : "vs"}
                    options={{
                        scrollBeyondLastLine: false,
                        minimap: { enabled: false },
                        lineNumbersMinChars: 3,
                        originalEditable: false,
                        wordWrap: "on",
                        renderIndicators: diffMode,
                        renderSideBySide: diffMode,
                        renderGutterMenu: false,
                        renderControlCharacters: false,
                        renderOverviewRuler: false,
                        useInlineViewWhenSpaceIsLimited: false,
                        unicodeHighlight: {
                            ambiguousCharacters: false,
                            invisibleCharacters: false,
                            nonBasicASCII: false
                        }
                    }}
                    onMount={(editor, api) => {
                        diffEditor.current = editor;
                        editorAPI.current = api.editor;

                        editor.getModifiedEditor().layout();

                        if (fileSelect.name) {
                            fetchContent(fileSelect)
                                .then((data) => {
                                    if (!data) return;
                                    editor.setModel({
                                        original: api.editor.createModel(data["origin"], "text/plain"),
                                        modified: api.editor.createModel(data["format"], "text/plain"),
                                    });
                                    setIsLoading(0);
                                })
                                .catch((error) => {
                                    pushError(error, "获取文件内容失败");
                                    setIsLoading(0);
                                });
                        }

                        editor.getModifiedEditor().onDidChangeModelContent(() => {
                            setIsSaved(false);
                        });
                    }}
                />
            </Box >
        </>
    );
}