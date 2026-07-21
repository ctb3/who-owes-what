# GitHub Actions authenticates by OIDC, so no AWS keys live in repo secrets.
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "assume_by_github" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Only this repository. Two subject shapes are allowed because the repo has
    # GitHub's immutable subject claims on, which embeds numeric login/repo ids
    # (repo:owner@<id>/name@<id>:...). Keeping the plain form too means the trust
    # survives that setting being turned off. StringLike matches if either does.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values = concat(
        ["repo:${var.github_repo}:*"],
        var.github_repo_immutable != "" ? ["repo:${var.github_repo_immutable}:*"] : [],
      )
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = "${var.project}-github-deploy"
  assume_role_policy = data.aws_iam_policy_document.assume_by_github.json
}

# Broad by intent: this role runs `terraform apply` for the whole stack. It is
# scoped by which repo can assume it, not by which actions it can take.
resource "aws_iam_role_policy_attachment" "deploy" {
  role       = aws_iam_role.deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# PowerUserAccess excludes IAM, which Terraform needs for the Lambda role.
data "aws_iam_policy_document" "deploy_iam" {
  statement {
    effect = "Allow"
    actions = [
      "iam:CreateRole",
      "iam:DeleteRole",
      "iam:GetRole",
      "iam:PassRole",
      "iam:TagRole",
      "iam:AttachRolePolicy",
      "iam:DetachRolePolicy",
      "iam:PutRolePolicy",
      "iam:DeleteRolePolicy",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListInstanceProfilesForRole",
    ]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project}-*"]
  }
}

resource "aws_iam_role_policy" "deploy_iam" {
  name   = "manage-app-roles"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy_iam.json
}
