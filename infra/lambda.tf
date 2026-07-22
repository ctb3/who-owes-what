resource "random_password" "app_secret" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "app_secret" {
  name                    = "${var.project}/app-secret"
  description             = "HMAC key for event access cookies"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "app_secret" {
  secret_id     = aws_secretsmanager_secret.app_secret.id
  secret_string = random_password.app_secret.result

  # Rotating this would sign every existing access cookie out at once.
  lifecycle {
    ignore_changes = [secret_string]
  }
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.project}-lambda"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "lambda" {
  statement {
    effect    = "Allow"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [aws_dynamodb_table.events.arn]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "app-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.project}"
  retention_in_days = 14
}

resource "aws_lambda_function" "app" {
  function_name = var.project
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = local.image_uri
  memory_size   = var.lambda_memory_mb
  timeout       = 30

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.events.name
      # Read at cold start, never logged.
      APP_SECRET                   = aws_secretsmanager_secret_version.app_secret.secret_string
      NODE_ENV                     = "production"
      AWS_LWA_INVOKE_MODE          = "buffered"
      AWS_LWA_READINESS_CHECK_PATH = "/api/health"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}

resource "aws_lambda_function_url" "app" {
  function_name      = aws_lambda_function.app.function_name
  authorization_type = "AWS_IAM"
}

# Only CloudFront may invoke the function URL. Since October 2025, OAC-signed
# requests to function URLs are authorized against BOTH actions — without
# InvokeFunction alongside InvokeFunctionUrl, every request 403s before the
# handler runs.
resource "aws_lambda_permission" "cloudfront" {
  statement_id           = "AllowCloudFront"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.app.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.app.arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "cloudfront_invoke" {
  statement_id  = "AllowCloudFrontInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.app.function_name
  principal     = "cloudfront.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.app.arn
}
