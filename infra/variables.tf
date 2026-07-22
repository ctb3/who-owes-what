variable "region" {
  type    = string
  default = "us-east-2"
}

variable "project" {
  type    = string
  default = "who-owes-what"
}

variable "domain_name" {
  description = "Custom domain served by CloudFront."
  type        = string
  default     = "split.ctb3.net"
}

variable "dns_zone" {
  description = "Route53 hosted zone the domain lives in (trailing dot optional)."
  type        = string
  default     = "ctb3.net"
}

variable "image_digest" {
  description = "sha256:... of the image already pushed to ECR. CI passes this."
  type        = string
}

variable "lambda_memory_mb" {
  type    = number
  default = 1024
}
