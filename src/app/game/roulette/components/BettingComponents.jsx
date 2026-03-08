"use client";
import React from "react";
import { Box, Typography } from "@mui/material";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import ParentSize from "@visx/responsive/lib/components/ParentSize";

const enhancedTooltip = {
    tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(5px)',
        padding: '8px 12px',
        fontSize: '0.85rem',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    }
};

export const BetBox = ({ betValue = 0, betType = "", position = "top-right", ...props }) => {
    const getPosition = () => {
        switch (position) {
            case "top-right": return { top: "25%", left: "75%" };
            case "top-left": return { top: "25%", left: "25%" };
            case "bottom-right": return { top: "75%", left: "75%" };
            case "bottom-left": return { top: "75%", left: "25%" };
            default: return { top: "25%", left: "75%" };
        }
    };

    return (
        <Tooltip
            title={<Typography>{betType}: {betValue}</Typography>}
            arrow
            placement="top"
            componentsProps={{ tooltip: { sx: enhancedTooltip.tooltip } }}
        >
            <Box
                sx={{
                    position: "absolute",
                    ...getPosition(),
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 5,
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "rgba(255, 215, 0, 0.9)",
                    border: "2px solid rgba(255, 255, 255, 0.8)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
                    "&:hover": {
                        transform: "translate(-50%, -50%) scale(1.1)",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.5)",
                    },
                }}
                {...props}
            >
                <Typography
                    sx={{
                        fontSize: "13px",
                        color: "black",
                        fontWeight: "bold",
                        textShadow: "0 0 2px rgba(255,255,255,0.5)",
                    }}
                >
                    {betValue}
                </Typography>
            </Box>
        </Tooltip>
    );
};

export const GridInside = ({
    insideNumber = -1,
    topEdge = false,
    red = false,
    straightup = 0,
    splitleft = 0,
    splitbottom = 0,
    corner = 0,
    placeBet,
    isWinner = false,
    ...props
}) => {
    const getCornerNumbers = () => {
        const cornerMap = {
            2: "0,1,2", 5: "1,2,4,5", 8: "4,5,7,8", 11: "7,8,10,11",
            14: "10,11,13,14", 17: "13,14,16,17", 20: "16,17,19,20",
            23: "19,20,22,23", 26: "22,23,25,26", 29: "25,26,28,29",
            32: "28,29,31,32", 35: "31,32,33,35", 3: "2,3,0", 6: "2,3,5,6",
            9: "5,6,8,9", 12: "8,9,11,12", 15: "11,12,14,15", 18: "14,15,17,18",
            21: "17,18,20,21", 24: "20,21,23,24", 27: "23,24,26,27",
            30: "26,27,29,30", 33: "29,30,32,33", 36: "32,33,35,36"
        };
        const cornerNumbers = cornerMap[insideNumber];
        return cornerNumbers ? `Corner ${cornerNumbers.replace(/,/g, '-')}` : `Corner ${insideNumber}`;
    };

    const getSplitNumbers = () => {
        const splitMap = {
            1: "0,1", 2: "0,2", 3: "0,3", 4: "1,4", 7: "4,7", 10: "7,10",
            13: "10,13", 16: "13,16", 19: "16,19", 22: "19,22", 25: "22,25",
            28: "25,28", 31: "28,31", 34: "31,34", 5: "2,5", 8: "5,8",
            11: "8,11", 14: "11,14", 17: "14,17", 20: "17,20", 23: "20,23",
            26: "23,26", 29: "26,29", 32: "29,32", 35: "32,35", 6: "3,6",
            9: "6,9", 12: "9,12", 15: "12,15", 18: "15,18", 21: "18,21",
            24: "21,24", 27: "24,27", 30: "27,30", 33: "30,33", 36: "33,36"
        };
        const splitNumbers = splitMap[insideNumber];
        return splitNumbers ? `Split ${splitNumbers.replace(',', '-')}` : `Split ${insideNumber}`;
    };

    const getBottomBetNumbers = () => {
        const isBottomRow = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].includes(insideNumber);
        if (isBottomRow) {
            return `Street ${insideNumber}-${insideNumber + 1}-${insideNumber + 2}`;
        }
        const bottomSplitMap = {
            2: "1,2", 3: "2,3", 5: "4,5", 6: "5,6", 8: "7,8", 9: "8,9",
            11: "10,11", 12: "11,12", 14: "13,14", 15: "14,15", 17: "16,17",
            18: "17,18", 20: "19,20", 21: "20,21", 23: "22,23", 24: "23,24",
            26: "25,26", 27: "26,27", 29: "28,29", 30: "29,30", 32: "31,32",
            33: "32,33", 35: "34,35", 36: "35,36"
        };
        const splitNumbers = bottomSplitMap[insideNumber];
        return splitNumbers ? `Split ${splitNumbers.replace(',', '-')}` : `Split ${insideNumber}-${insideNumber + 3}`;
    };

    return (
        <ParentSize {...props}>
            {({ width }) => (
                <Box
                    sx={{
                        position: "relative", display: "flex", alignItems: "stretch", width: width,
                        height: topEdge ? width + 10 : width,
                        ...(red && { backgroundColor: (theme) => theme.palette.game.red }),
                        ...(isWinner && { boxShadow: "0 0 15px 5px rgba(255, 215, 0, 0.7)", zIndex: 3 }),
                        transition: "all 0.2s ease",
                        "&:hover": { transform: "scale(1.02)", boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)", zIndex: 2 }
                    }}
                >
                    <Box sx={{ display: "flex", flexDirection: "column", width: "10px" }}>
                        {topEdge && <Box sx={{ height: "10px", backgroundColor: (theme) => theme.palette.dark.card }} />}
                        <Box
                            sx={{ position: "relative", flex: 1, backgroundColor: (theme) => theme.palette.dark.card, cursor: "pointer" }}
                            onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 2)}
                        >
                            {splitleft > 0 && <BetBox betValue={splitleft} betType={getSplitNumbers()} position="top-right" onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 2)} />}
                        </Box>
                        {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].includes(insideNumber) && (
                            <Box
                                sx={{ position: "relative", height: "10px", backgroundColor: (theme) => theme.palette.dark.card, cursor: "pointer" }}
                                onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 4)}
                            >
                                {corner > 0 && <BetBox betValue={corner} betType={getCornerNumbers()} position="bottom-right" onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 4)} />}
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        {topEdge && <Box sx={{ height: "10px", backgroundColor: (theme) => theme.palette.dark.card }} />}
                        <Box
                            sx={{ position: "relative", flex: 5, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}
                            onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 1)}
                        >
                            <Typography variant="h5" sx={{ position: "relative", zIndex: 4, textShadow: "0 0 4px rgba(0,0,0,0.8)", fontWeight: "bold", backgroundColor: "rgba(0,0,0,0.4)", padding: "2px 6px", borderRadius: "4px", transform: "translateX(-10%)" }}>
                                {insideNumber}
                            </Typography>
                            {straightup > 0 && <BetBox betValue={straightup} betType={"Straight up"} position="top-right" onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 1)} />}
                        </Box>
                        <Box
                            sx={{ position: "relative", flex: 1, backgroundColor: (theme) => theme.palette.dark.card, maxHeight: "10px", minHeight: "10px", cursor: "pointer" }}
                            onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 3)}
                        >
                            {splitbottom > 0 && <BetBox betValue={splitbottom} betType={getBottomBetNumbers()} position="bottom-right" onClick={(e) => placeBet(e, "inside", (insideNumber - 1) * 4 + 3)} />}
                        </Box>
                    </Box>
                </Box>
            )}
        </ParentSize>
    );
};

export const GridZero = ({ inside, placeBet, ...props }) => (
    <ParentSize {...props}>
        {({ width, height }) => (
            <Box
                sx={{
                    position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: width, height: height, cursor: "pointer",
                    clipPath: "polygon(100% 0%, 100% 100%, 40% 100%, 0% 50%, 40% 0%)",
                    backgroundColor: (theme) => theme.palette.game.green,
                }}
                onClick={(e) => placeBet(e, "inside", 0)}
            >
                <Typography variant="h5">0</Typography>
                {inside[0] > 0 && <BetBox betValue={inside[0]} betType={"Straight up"} onClick={(e) => placeBet(e, "inside", 0)} />}
            </Box>
        )}
    </ParentSize>
);

export const GridColumnBet = ({ topCard = false, bottomCard = false, index, columns, bet, placeBet, ...props }) => (
    <ParentSize style={{ height: "100%" }} {...props}>
        {({ width, height }) => (
            <Box
                sx={{
                    position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: width, height: height, cursor: "pointer",
                    backgroundColor: (theme) => theme.palette.dark.button,
                    borderTop: (theme) => `${topCard ? 10 : 5}px solid ${theme.palette.dark.card}`,
                    borderBottom: (theme) => `${bottomCard ? 10 : 5}px solid ${theme.palette.dark.card}`,
                    borderRight: (theme) => "10px solid " + theme.palette.dark.card,
                    borderLeft: (theme) => "10px solid " + theme.palette.dark.card,
                }}
                onClick={(e) => placeBet(e, "columns", index)}
            >
                <Typography variant="h5">2 To 1</Typography>
                {columns[index] > 0 && <BetBox betValue={columns[index]} betType={`2 To 1 (row ${index + 1})`} onClick={(e) => placeBet(e, "columns", index)} />}
            </Box>
        )}
    </ParentSize>
);

export const GridOutsideBet = ({ rightCard = false, active = false, ...props }) => (
    <Box
        sx={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center", py: 2, cursor: "pointer",
            backgroundColor: (theme) => theme.palette.dark.button,
            borderBottom: (theme) => "10px solid " + theme.palette.dark.card,
            borderLeft: (theme) => "10px solid " + theme.palette.dark.card,
            transition: "all 0.3s ease",
            "&:hover": { transform: "translateY(-2px)", boxShadow: "0 5px 15px rgba(0, 0, 0, 0.3)" }
        }}
        {...props}
    >
        {props.children}
    </Box>
);
