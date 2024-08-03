#!/bin/bash

set -e

# Variables
LAMBDA1_DIR="../lambdas/empresas_bd"
LAMBDA2_DIR="../lambdas/consultarRuc"
LAMBDA3_DIR="../lambdas/validarRuc"

# Package Lambda functions
zip -r ${LAMBDA1_DIR}/empresas_bd.zip ${LAMBDA1_DIR}/*
zip -r ${LAMBDA2_DIR}/consultarRuc.zip ${LAMBDA2_DIR}/*
zip -r ${LAMBDA3_DIR}/validarRuc.zip ${LAMBDA3_DIR}/*

# Apply Terraform
cd ../terraform
terraform init
terraform apply -auto-approve
