provider "aws" {
  region = var.region
}

resource "aws_iam_role" "lambda_role" {
  name = "lambda_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/LambdaDynamoDBEmpresasPolicy"
  ]
}

data "aws_caller_identity" "current" {}

resource "aws_api_gateway_rest_api" "ruc_api" {
  name        = "ruc-api"
  description = "API Gateway for RUC-related Lambdas"
}

resource "aws_lambda_function" "empresas_bd" {
  function_name = "empresas_bd"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn
  filename      = "${path.module}/../lambdas/empresas_bd/empresas_bd.zip"
}

resource "aws_lambda_function" "consultarRuc" {
  function_name = "consultarRuc"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn
  filename      = "${path.module}/../lambdas/consultarRuc/consultarRuc.zip"
}

resource "aws_lambda_function" "validarRuc" {
  function_name = "validarRuc"
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  role          = aws_iam_role.lambda_role.arn
  filename      = "${path.module}/../lambdas/validarRuc/validarRuc.zip"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.ruc_api.id
  parent_id   = aws_api_gateway_rest_api.ruc_api.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.ruc_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "empresas_bd_integration" {
  rest_api_id = aws_api_gateway_rest_api.ruc_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.empresas_bd.invoke_arn
}

resource "aws_api_gateway_integration" "consultarRuc_integration" {
  rest_api_id = aws_api_gateway_rest_api.ruc_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.consultarRuc.invoke_arn
}

resource "aws_api_gateway_integration" "validarRuc_integration" {
  rest_api_id = aws_api_gateway_rest_api.ruc_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method
  type        = "AWS_PROXY"
  uri         = aws_lambda_function.validarRuc.invoke_arn
}

resource "aws_api_gateway_deployment" "api_deployment" {
  depends_on = [
    aws_api_gateway_integration.empresas_bd_integration,
    aws_api_gateway_integration.consultarRuc_integration,
    aws_api_gateway_integration.validarRuc_integration
  ]
  rest_api_id = aws_api_gateway_rest_api.ruc_api.id
  stage_name  = "prod"
}

output "api_url" {
  value = aws_api_gateway_deployment.api_deployment.invoke_url
}
