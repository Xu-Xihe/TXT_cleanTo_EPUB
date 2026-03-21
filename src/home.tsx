import {
    AppBar,
    Avatar,
    Box,
    Typography,
    IconButton,
    Button,
    useMediaQuery,
    useTheme,
    Badge,
    Backdrop,
    Stepper,
    Step,
    StepLabel,
} from '@mui/material';
import ContrastRoundedIcon from '@mui/icons-material/ContrastRounded';
import CableRoundedIcon from '@mui/icons-material/CableRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';

import { useColorScheme } from '@mui/material/styles';

import { useEffect, useState } from "react";

import { useQuery } from '@tanstack/react-query'

import { api } from './hooks/api';

import useLocalStorage from "./hooks/storage";

import PathSelector from './components/path_selector';
import FileList from "./components/file_edit";
import ErrorPopout from './components/error_popout';
import FileConfirm from './components/file_confirm';
import TranConfig from './components/tran_config';


export default function Home() {
    // Path & ls state
    const [workPath, setWorkPath] = useLocalStorage("path", "", "local");
    const [activeStep, setActiveStep] = useState(0);

    // UI state
    const [contrastTheme, setContrastTheme] = useState<boolean>(false)
    const [apiConnect, setApiConnect] = useState<boolean>(false);

    useQuery({
        queryKey: ["health"],
        queryFn: async () => {
            try {
                await api.get("/api/health");
                setApiConnect(true);
            } catch {
                setApiConnect(false);
            }
            return null;
        },
        retry: 0,
        refetchInterval: 3000,
        refetchIntervalInBackground: true,
    })

    const theme = useTheme();
    const { mode, setMode } = useColorScheme();
    const isDark = useMediaQuery("(prefers-color-scheme: dark)");

    useEffect(() => {
        if (contrastTheme) {
            if (mode === "system") {
                setMode(isDark ? "light" : "dark");
            }
        }
        else {
            setMode("system");
        }
    }, [contrastTheme]);

    const appBarComponent = (
        <AppBar
            position="fixed"
            sx={{
                height: 68,
                bgcolor: theme.vars?.palette.secondary.light,
                transition: theme.transitions.create(["background-color", "box-shadow", "border-color", "color"])
            }}
        >
            <Box sx={{
                px: 3,
                width: "100%",
                height: "100%",
                display: 'flex',
                justifyContent: "space-between",
                alignItems: "center",
            }}>
                <Box sx={{
                    display: 'flex',
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 3,
                }}>
                    <Avatar alt="TtE" src="/Icon-rounded.svg" variant="rounded" />
                    <Stepper activeStep={activeStep} >
                        {["选择路径", "应用格式", "单独编辑", "转换选项"].map((text, index) => (
                            <Step key={index}>
                                <StepLabel
                                    sx={{
                                        "& .MuiStepIcon-root": {
                                            fontSize: 38,
                                        },

                                        "& .MuiStepIcon-text": {
                                            fontSize: 16,
                                            fill: "black",
                                        },

                                        "& .MuiStepLabel-label": {
                                            fontSize: 20,
                                            color: theme.vars?.palette.text.primary,
                                        }
                                    }}
                                >
                                    {text}
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                    <Button
                        variant="outlined"
                        startIcon={<NavigateBeforeRoundedIcon />}
                        onClick={() => { setActiveStep(prev => Math.max(prev - 1, 0)); }}
                        sx={{
                            backgroundColor: (theme) => theme.vars?.palette.background.paper,
                        }}
                        disabled={activeStep === 0}
                    >
                        上一步
                    </Button>
                </Box>
                <Box sx={{
                    display: 'flex',
                    gap: 1,
                }}>
                    <IconButton>
                        <Badge variant="dot" color={apiConnect ? "success" : "error"}>
                            <CableRoundedIcon />
                        </Badge>
                    </IconButton>
                    <IconButton onClick={() => setContrastTheme(!contrastTheme)}>
                        <ContrastRoundedIcon />
                    </IconButton>
                </Box>
            </Box>
        </AppBar >
    );

    const apiDisconnectBackdrop = (
        <Backdrop
            open={!apiConnect}
            sx={{
                color: '#fff',
                flexDirection: "column",
                display: "flex",
                justifyContent: "space-evenly",
                alignItems: "center",
                zIndex: 9999,
            }}
        >
            <Typography variant="h3">无法连接到服务器，请检查后端服务器状态</Typography>
        </Backdrop>
    );

    const steps = [
        <PathSelector
            init_path={workPath}
            setInitPath={setWorkPath}
            setStep={setActiveStep}
        />,
        <FileList setStep={setActiveStep} />,
        <FileConfirm setStep={setActiveStep} />,
        <TranConfig />
    ];

    return (
        <>
            <ErrorPopout />
            {appBarComponent}
            {apiDisconnectBackdrop}

            <Box sx={{
                position: "absolute",
                top: 68,
                left: 0,
                right: 0,
                bottom: 0,
                height: 'calc(100vh - 68px)',
                width: '100vw',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflowY: 'auto',
                backgroundColor: (theme) => theme.vars?.palette.background.default,
            }}>
                {steps[activeStep]}
            </Box>
        </>
    );
}
