output "url" {
  description = "Public URL of the app."
  value       = "https://${var.domain_name}"
}

output "cloudfront_domain" {
  description = "CloudFront's own domain (fallback)."
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "table_name" {
  value = aws_dynamodb_table.events.name
}
