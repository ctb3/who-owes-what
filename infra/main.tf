terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # S3 native locking (use_lockfile) — no separate lock table needed.
  backend "s3" {
    bucket       = "who-owes-what-tfstate-619467956318"
    key          = "app/terraform.tfstate"
    region       = "us-east-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project = var.project
    }
  }
}

data "aws_caller_identity" "current" {}

data "aws_ecr_repository" "app" {
  name = var.project
}

locals {
  image_uri = "${data.aws_ecr_repository.app.repository_url}@${var.image_digest}"
}
