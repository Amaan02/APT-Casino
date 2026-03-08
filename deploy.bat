@echo off
setlocal enabledelayedexpansion
REM APT Casino CreditCoin Deployment - Windows
REM Deploys Solidity contracts to CreditCoin Testnet and frontend to Vercel

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%"
set "DEPLOY_CONTRACTS=true"
set "DEPLOY_FRONTEND=true"
set "VERBOSE=false"

:parse_args
if "%~1"=="" goto :main
if /i "%~1"=="-c" set "DEPLOY_FRONTEND=false" & shift & goto :parse_args
if /i "%~1"=="--contracts-only" set "DEPLOY_FRONTEND=false" & shift & goto :parse_args
if /i "%~1"=="-f" set "DEPLOY_CONTRACTS=false" & shift & goto :parse_args
if /i "%~1"=="--frontend-only" set "DEPLOY_CONTRACTS=false" & shift & goto :parse_args
if /i "%~1"=="-v" set "VERBOSE=true" & shift & goto :parse_args
if /i "%~1"=="--verbose" set "VERBOSE=true" & shift & goto :parse_args
if /i "%~1"=="-h" goto :help
if /i "%~1"=="--help" goto :help
echo Unknown option: %~1 & goto :help

:help
echo APT Casino CreditCoin Deployment
echo Usage: %~nx0 [OPTIONS]
echo   -c, --contracts-only   Deploy only contracts (CreditCoin Testnet)
echo   -f, --frontend-only    Deploy only frontend
echo   -v, --verbose          Verbose output
echo   -h, --help             Help
echo Env: CREDITCOIN_TREASURY_PRIVATE_KEY or TREASURY_PRIVATE_KEY
exit /b 1

:main
echo APT Casino CreditCoin Deployment
echo Contracts: %DEPLOY_CONTRACTS% ^| Frontend: %DEPLOY_FRONTEND%
echo.

node --version >nul 2>&1 || (echo Node.js required. & exit /b 1)
npm --version >nul 2>&1 || (echo npm required. & exit /b 1)

cd /d "%PROJECT_ROOT%"
call npm install
if errorlevel 1 exit /b 1

if "%DEPLOY_CONTRACTS%"=="true" (
  echo [STEP] Compiling and deploying contracts to CreditCoin Testnet...
  if "%VERBOSE%"=="true" (
    call npx hardhat compile
    call npx hardhat run scripts/deploy-creditcoin-contracts.js --network creditcoin-testnet
  ) else (
    call npx hardhat compile >nul 2>&1
    call npx hardhat run scripts/deploy-creditcoin-contracts.js --network creditcoin-testnet
  )
  if errorlevel 1 exit /b 1
  echo [INFO] Contracts deployed.
)

if "%DEPLOY_FRONTEND%"=="true" (
  echo [STEP] Building and deploying frontend...
  if "%VERBOSE%"=="true" (
    call npm run build
  ) else (
    call npm run build >nul 2>&1
  )
  if errorlevel 1 exit /b 1
  vercel whoami >nul 2>&1 || (echo Run: vercel login & exit /b 1)
  if "%VERBOSE%"=="true" (call vercel --prod) else (call vercel --prod --yes)
  if errorlevel 1 exit /b 1
  echo [INFO] Frontend deployed to Vercel.
)

echo.
echo [INFO] Deployment completed. Set env vars in Vercel and test.
exit /b 0
