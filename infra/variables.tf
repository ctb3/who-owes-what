variable "region" {
  type    = string
  default = "us-east-2"
}

variable "project" {
  type    = string
  default = "who-owes-what"
}

variable "image_digest" {
  description = "sha256:... of the image already pushed to ECR. CI passes this."
  type        = string
}

variable "lambda_memory_mb" {
  type    = number
  default = 1024
}
