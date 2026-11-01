variable "name" {
  description = "OAC・Web ACL・IPセットの名前に使う"
  type        = string
}

variable "bucket_name" {
  description = "配信するバケット"
  type        = string
}

variable "bucket_arn" {
  description = "配信するバケットのARN"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "配信するバケットのリージョンのドメイン名"
  type        = string
}

variable "allowed_cidrs" {
  description = "閲覧を許可するIPv4のCIDR"
  type        = list(string)
}
