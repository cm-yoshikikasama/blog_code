variable "name" {
  description = "Name used for the OAC, web ACL, and IP set"
  type        = string
}

variable "bucket_name" {
  description = "Bucket to serve"
  type        = string
}

variable "bucket_arn" {
  description = "ARN of the bucket to serve"
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "Regional domain name of the bucket to serve"
  type        = string
}

variable "allowed_cidrs" {
  description = "IPv4 CIDRs allowed to view"
  type        = list(string)
}
