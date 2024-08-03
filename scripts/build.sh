#!/bin/bash

set -e

# Variables
LAMBDA1_DIR="../lambdas/empresas_bd"
LAMBDA2_DIR="../lambdas/consultarRuc"
LAMBDA3_DIR="../lambdas/validarRuc"

# Install dependencies
cd ${LAMBDA1_DIR}
npm install
cd ../consultarRuc
npm install
cd ../validarRuc
npm install
