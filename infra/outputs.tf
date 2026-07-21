output "url" {
  description = "Public URL of the app."
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "distribution_id" {
  value = aws_cloudfront_distribution.app.id
}

output "table_name" {
  value = aws_dynamodb_table.events.name
}
