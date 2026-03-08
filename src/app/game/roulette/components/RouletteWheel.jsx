"use client";
import React, { useState, useEffect, useRef } from "react";
import { Box } from "@mui/material";

const RouletteWheel = ({ spinning, result, onSpinComplete, onSpinStart, onWin, isSmallScreen, isPortrait }) => {
    const wheelRef = useRef(null);
    const [spinComplete, setSpinComplete] = useState(false);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (spinning && result >= 0) {
            const segmentAngle = 360 / 37;
            const baseRotation = 3600;
            const resultPosition = segmentAngle * result;
            const finalRotation = baseRotation + resultPosition;

            setRotation(finalRotation);
            if (onSpinStart) onSpinStart();

            const timer = setTimeout(() => {
                setSpinComplete(true);
                if (onSpinComplete) onSpinComplete();
                if (onWin) onWin();
            }, 4200);
            return () => clearTimeout(timer);
        } else if (!spinning) {
            setRotation(0);
            setSpinComplete(false);
        }
    }, [spinning, result, onSpinComplete, onSpinStart, onWin]);

    const wheelSize = isSmallScreen && !isPortrait ? '120px' : '200px';

    return (
        <Box
            sx={{
                width: wheelSize,
                height: wheelSize,
                borderRadius: '50%',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                margin: 'auto',
                display: result >= 0 ? 'block' : 'none'
            }}
        >
            <Box
                ref={wheelRef}
                sx={{
                    width: '100%',
                    height: '100%',
                    backgroundImage: 'url(/images/roulette-wheel.png)',
                    backgroundSize: 'contain',
                    transformOrigin: 'center',
                    position: 'relative',
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
                }}
            />
            {spinComplete && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '2rem',
                        textShadow: '0 0 10px rgba(0,0,0,0.8)',
                        zIndex: 10
                    }}
                >
                    {result}
                </Box>
            )}
        </Box>
    );
};

export default RouletteWheel;
