# Applied once, with local state, before anything else exists. Creates the
# things the main config and CI depend on: remote state storage, the image
# registry, and the role GitHub Actions assumes.
#
#   AWS_PROFILE=ctb3-general-admin terraform -chdir=infra/bootstrap apply

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "us-east-2"
}

variable "project" {
  type    = string
  default = "who-owes-what"
}

variable "state_bucket" {
  description = "Globally unique bucket name for Terraform state."
  type        = string
  default     = "who-owes-what-tfstate-619467956318"
}

variable "github_repo" {
  description = "owner/repo allowed to assume the deploy role."
  type        = string
  default     = "ctb3/who-owes-what"
}

data "aws_caller_identity" "current" {}
