output "empresas_bd_arn" {
  value = aws_lambda_function.empresas_bd.arn
}

output "consultarRuc_arn" {
  value = aws_lambda_function.consultarRuc.arn
}

output "validarRuc_arn" {
  value = aws_lambda_function.validarRuc.arn
}

output "api_gateway_url" {
  value = aws_api_gateway_deployment.api_deployment.invoke_url
}
