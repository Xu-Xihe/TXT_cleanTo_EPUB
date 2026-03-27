import {
    Autocomplete,
    Box,
    Button,
    Divider,
    List,
    ListItemButton,
    ListItemText,
    Paper,
    TextField,
    Typography,
} from "@mui/material";

import { useEffect, useState } from "react";

import { api } from "../hooks/api";
import { useErrorMsg } from "../components/error_popout";


export default function PathSelector({ init_path, setInitPath, setStep }: { init_path: string, setInitPath: (para: string) => void, setStep: (para: number) => void }) {
    const [lsDir, setLsDir] = useState<string[]>([]);
    const [path, setPath] = useState<string>(init_path);
    const { pushError } = useErrorMsg();

    const set_path = (path: string) => {
        api.get("/api/path/set", { searchParams: { path } }).json()
            .then(() => {
                setInitPath(path);
                setStep(1);
            })
            .catch((error) => { pushError(error, "设置路径失败") })

    }

    useEffect(() => {
        if (init_path == "") {
            api.get("/api/path/get").json<string>()
                .then((data) => { setPath(data) })
                .catch((error) => { pushError(error, "获取默认路径失败") })
        }
    }, []);

    useEffect(() => {
        api.get("/api/path/folder", { searchParams: { path } }).json<string[]>()
            .then((data) => { setLsDir(data); })
            .catch((error) => { pushError(error, "获取路径列表失败") })
    }, [path]);

    return (
        <Paper elevation={13} sx={{
            width: "80%",
            height: "80%",
            p: 0,
            m: 0,
        }}>
            <Box sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                width: "100%",
            }}>
                <Box sx={{ display: 'flex', height: '13%', pl: 8, alignItems: 'center' }}>
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                        编辑路径
                    </Typography>
                </Box>
                <Divider />
                <Box sx={{ display: "flex", px: 8, pt: 3, alignItems: "space-between", flexDirection: "column", width: '100%', height: '74%' }}>
                    <Autocomplete
                        sx={{ width: '100%', flexShrink: 0, mt: 1 }}
                        value={path}
                        options={[
                            '/',
                            ...path.split('/').filter(Boolean).map((_, i, arr) => '/' + arr.slice(0, i + 1).join('/')),
                            ...lsDir.map(item => path === '/' ? item : path + item)
                        ]}
                        onChange={(_, value) => setPath(value ?? "/")}
                        renderInput={(params) => <TextField {...params} label="Path" slotProps={{ inputLabel: { shrink: true } }} />}
                    />
                    <List sx={{ width: '100%', overflow: "auto" }}>
                        {[".", "..", ...lsDir].map((item) => (
                            <ListItemButton
                                key={item}
                                sx={{ maxHeight: 38 }}
                                onClick={() => {
                                    if (item === ".") { }
                                    else if (item === "..") {
                                        const parentPath = path.split("/").slice(0, -1).join("/");
                                        setPath(parentPath === "" ? "/" : parentPath);
                                    }
                                    else {
                                        setPath(path === "/" ? item : path + item);
                                    }
                                }}
                            >
                                <ListItemText primary={item} />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', px: 3, height: '13%' }}>
                    <Button type="button" variant="contained" onClick={() => { set_path(path) }}>
                        下一步
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}