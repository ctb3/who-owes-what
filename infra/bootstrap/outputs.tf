output "state_bucket" {
  value = aws_s3_bucket.state.id
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE repository variable in GitHub."
  value       = aws_iam_role.deploy.arn
}
