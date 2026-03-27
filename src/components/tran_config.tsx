import {
    Box,
    Button,
    Divider,
    FormGroup,
    Paper,
    FormControlLabel,
    Switch,
    Typography,
} from "@mui/material";
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';

import { useEffect, useRef, useState } from "react";

import { api } from "../hooks/api";
import { useErrorMsg } from "../components/error_popout";

import useLocalStorage from "../hooks/storage";
import AppleSuccess from "./success.tsx";
import { LoadingCard } from "./loading.tsx";


interface TranConfig {
    save_txt: boolean;
    del_origin: boolean;
}

interface FileName {
    name: string;
    title: string;
    creator: string;
    temp_name: string;
}


export default function TranConfig() {
    const { pushError } = useErrorMsg();
    const [tranConfig, setTranConfig] = useLocalStorage<TranConfig>("tranconfig", { save_txt: false, del_origin: false }, "local")
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [isSuccess, setIsSuccess] = useState<boolean>(false)
    const lsFile = useRef<string[]>([]);

    useEffect(() => {
        api.get("/api/tran/ls").json<FileName[]>()
            .then((data) => lsFile.current = data.map((f) => f.name))
            .catch((error) => pushError(error, "获取文件列表失败"));
    }, []);

    return (
        <>
            {isSuccess && <AppleSuccess />}
            {isLoading && <LoadingCard list={lsFile.current} path="/api/tran/execute" next={() => setIsSuccess(true)} cancel={() => setIsLoading(false)} fetchargs={{ json: tranConfig }} />}
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
                    justifyContent: "space-evenly",
                    px: 8
                }}>
                    <Typography variant="h4">
                        转换配置
                    </Typography>
                    <Divider flexItem />
                    <FormGroup>
                        <FormControlLabel control={
                            <Switch
                                checked={tranConfig.save_txt}
                                onChange={(e) => setTranConfig({
                                    save_txt: e.target.checked,
                                    del_origin: tranConfig.del_origin,
                                })}
                            />
                        } label="保存txt文件" />
                        <FormControlLabel control={
                            <Switch
                                checked={tranConfig.del_origin}
                                onChange={(e) => setTranConfig({
                                    save_txt: tranConfig.save_txt,
                                    del_origin: e.target.checked,
                                })}
                            />
                        } label="删除源文件" />
                    </FormGroup>
                    <Divider flexItem />
                    <Box sx={{ display: 'flex', width: '100%', justifyContent: "flex-end" }}>
                        <Button
                            variant="contained"
                            sx={{ gap: 1 }}
                            startIcon={<DoneAllRoundedIcon />}
                            onClick={() => setIsLoading(true)}
                        >
                            确定
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </>
    )
}