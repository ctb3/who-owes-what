locals {
  origin_id = "lambda"
}

# Signs CloudFront's requests so the IAM-protected function URL accepts them.
resource "aws_cloudfront_origin_access_control" "lambda" {
  name                              = "${var.project}-lambda"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "app" {
  enabled         = true
  comment         = var.project
  price_class     = "PriceClass_100"
  is_ipv6_enabled = true

  origin {
    domain_name              = replace(replace(aws_lambda_function_url.app.function_url, "https://", ""), "/", "")
    origin_id                = local.origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.lambda.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Everything is per-event data behind a secret URL: never cache it.
  default_cache_behavior {
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.to_lambda.id
  }

  # Build assets carry a content hash in the path, so they never change.
  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id = data.aws_cloudfront_cache_policy.optimized.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# Forward everything the app needs, but drop two headers on purpose:
#   - Host: must stay the Lambda URL's own hostname or the SigV4 signature fails.
#   - Authorization: OAC signs the origin request by *adding* an Authorization
#     header, but it will not overwrite one that's being forwarded. The managed
#     AllViewerExceptHostHeader policy forwards Authorization, so the signature
#     never got attached and Lambda saw an unsigned request (403 Forbidden).
resource "aws_cloudfront_origin_request_policy" "to_lambda" {
  name = "${var.project}-to-lambda"

  headers_config {
    header_behavior = "allExcept"
    headers {
      items = ["host", "authorization"]
    }
  }

  cookies_config {
    cookie_behavior = "all"
  }

  query_strings_config {
    query_string_behavior = "all"
  }
}
