import {
    Box,
    Skeleton,
    Button,
    LinearProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme,
} from "@mui/material";
import PauseCircleOutlineRoundedIcon from '@mui/icons-material/PauseCircleOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import PlayCircleOutlineRoundedIcon from '@mui/icons-material/PlayCircleOutlineRounded';

import { useEffect, useState, useRef } from "react";

import ky from "ky";

import { useErrorMsg } from "../components/error_popout";


interface FileStatus {
    filename: string;
    progress: number;
    error: string;
}


export function LoadingEditor({ text }: { text: string }) {
    return (
        <Box sx={{
            position: "absolute",
            top: 0,
            left: 188,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 666,
            p: 3,
            gap: 1,
            bgcolor: (theme) => theme.vars?.palette.background.default,
        }}>
            {text === ""
                ? (<>
                    <Skeleton variant="rounded" width="50%" height="100%" />
                    <Skeleton variant="rounded" width="50%" height="100%" />
                </>)
                : text
            }
        </Box>
    );
}

export function LoadingFullScreen() {
    return (
        <Box sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 666,
            p: 3,
            bgcolor: (theme) => theme.vars?.palette.background.default,
        }}>
            <Skeleton variant="rounded" height="100%" sx={{ width: 188, mr: 3 }} />
            <Skeleton variant="rounded" height="100%" sx={{ width: "100%" }} />
        </Box>
    );
}

export function LoadingCard({ list, path, next, cancel, fetchargs }: { list: string[]; path: string; next: () => void; cancel: () => void; fetchargs?: Record<string, any> }) {
    const { pushMsg } = useErrorMsg();
    const theme = useTheme();
    const [isFinished, setFinished] = useState(true);
    const [onGoing, setOngoing] = useState<FileStatus>({ filename: "", progress: 0, error: "" });
    const lsFile = useRef<FileStatus[]>(list.map((filename) => ({
        filename,
        progress: 0.0,
        error: "",
    })));

    const fetchProgress = async () => {
        try {
            const res = (await ky.post(path, { timeout: false, ...fetchargs })).body?.getReader();
            let latest: FileStatus = { filename: "", progress: 0, error: "" };
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await res?.read()!;
                if (done) break;

                const lines = decoder.decode(value, { stream: true }).split("\n");
                buffer = lines.pop()!;

                for (const line of lines) {
                    latest = JSON.parse(line);

                    console.log("Latest progress:", latest);

                    if (latest.filename) {
                        if (latest.filename !== onGoing.filename) {
                            lsFile.current = lsFile.current.map((file) =>
                                file.filename === latest.filename
                                    ? { ...file, progress: latest.progress, error: latest.error }
                                    : file
                            );
                        }
                        setOngoing(latest);
                    }
                }
            }
            try {
                const final = JSON.parse(buffer);
                if (final.filename) {
                    if (final.error) {
                        lsFile.current = lsFile.current.map((file) =>
                            file.filename === final.filename
                                ? { ...file, error: final.error }
                                : file
                        );
                    }
                    else {
                        lsFile.current = lsFile.current.map((file) =>
                            file.filename === final.filename
                                ? { ...file, progress: 1.0 }
                                : file
                        );
                    }
                    setOngoing(final);
                }
            }
            catch { }
        }
        catch (e) {
            pushMsg("File Execute: " + e);
        }
        setFinished(false);
    }


    useEffect(() => {
        fetchProgress();
    }, []);


    const status = (name: string) => {
        if (name === onGoing.filename)
            if (onGoing.progress >= 1)
                return 1; // Success
            else
                return 2; // Running

        const file = lsFile.current.find((file) => file.filename === name);

        if (file) {
            if (file.error)
                return 0; // Error
            else if (file.progress >= 1)
                return 1; // Success
            else
                return 3; // Pending
        }
        pushMsg(`File ${name} not found in status list.`);
        return -1; // Not found

    }
    const statusIcon = [
        <ErrorOutlineRoundedIcon color="error" />,
        <CheckCircleOutlineRoundedIcon color="success" />,
        <PlayCircleOutlineRoundedIcon color="primary" />,
        <PauseCircleOutlineRoundedIcon color="inherit" />,
    ]


    return (
        <Box sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 666,
            p: 3,
            bgcolor: theme.vars?.palette.background.default,
        }}>
            <List sx={{ width: "100%", maxHeight: "calc(100% - 68px - 6px)", overflowY: "auto" }}>
                {list.map((file) => (
                    <ListItem sx={{ width: '100%' }} key={file}>
                        <ListItemIcon>
                            {statusIcon[status(file)]}
                        </ListItemIcon>
                        <ListItemText color={theme.vars?.palette.text.primary}>
                            {file}
                        </ListItemText>
                        {status(file) === 0 && (<ListItemText color={theme.vars?.palette.error.main} primary={lsFile.current.find((f) => f.filename === file)?.error} />)}
                        {status(file) === 1 && (<LinearProgress variant="determinate" value={100} sx={{ width: "38%" }} color="success" />)}
                        {status(file) === 3 && (<LinearProgress variant="indeterminate" sx={{ width: "38%" }} color="inherit" />)}
                        {status(file) === 2 && (<LinearProgress variant="determinate" value={onGoing.progress * 100} sx={{ width: "38%" }} color="primary" />)}
                    </ListItem>
                ))}
            </List>
            <Box sx={{
                width: '100%',
                height: 68,
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 3,
            }}>
                <Button variant="outlined" onClick={() => cancel()}>
                    取消
                </Button>
                <Button variant="contained" onClick={() => next()} disabled={isFinished}>
                    下一步
                </Button>
            </Box>
        </Box>
    );
}