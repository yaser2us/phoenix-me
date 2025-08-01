#!/bin/bash

# Curl command for get_payment_favList_1 API call
# Based on your JWT token and required headers

JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjdXNfa2V5IjoiVTJGc2RHVmtYMThoTlRIT1g3cmIwSDJKQUY0YmNIckp5d0dNSG5CZHZDU0F6cFhIanY0RHVHQmQyWUtuUk5LaEZRZWVCc1BLMWt2aGVOdkk2RDcrUGc9PSIsImF1ZCI6WyJ6dXVsR2F0ZXdheSJdLCJ1c2VyX25hbWUiOiJZYXNlcjJ1cyIsImN1c1R5cGUiOiIxMCIsInNjb3BlIjpbIkVESVRfQkFOS0lORyIsIkVESVRfTk9OX0JBTktJTkciLCJSRUFEX0JBTktJTkciLCJSRUFEX05PTl9CQU5LSU5HIl0sIm1heWFfc2Vzc2lvbl9pZCI6IkBAQEEyMDI1MDczMTIxLjQzMDE0MTI4MDhAQEBAIiwibTJ1X3VzZXJfaWQiOjE3ODI3NzEzLCJwYW4iOiJZVTNDQjNveWcrK0pOVTJwcFpGNTZ1djVxQ3NtZ01sb3RYY0VtVFNLRVBzNG55T3R2TjBlc1pQRTBCSGJlWXZGNmRBdCtta2ExM2NZRmtId3NHejg2T1ZyL0ZOTlZmWk8ya1E2cjYyYTNkOFNrQzhzb01EN2k2VGYwcWpYczY4UFlVZDRabE1YYXNlWWk3Vkg1U1E0a2tUa1dSUHhxRjZOOElGb1ByOGkzOVU9IiwiZXhwIjoxNzg1NTQwNzU4LCJ1c2VySWQiOjUxMjYxMDksImp0aSI6Ijk5NmY3MTc4LWM4MDItNGIzZC1hYjM2LTc0MDYwYmZhNWY4NiIsImNsaWVudF9pZCI6Ik0yVUdBVEVXQVkifQ.MzsEONGYtBbT62PpUNbfVcX-dGk1-vonEQ0DZ0gL5jA"

echo "🚀 Making Curl Request to Maybank Payment Favorites API"
echo "========================================================"

curl -X GET "https://maya.maybank2u.com.my/payment/v1/pay/bill/favList" \
  -H "Accept: application/json" \
  -H "authorization: bearer $JWT_TOKEN" \
  -H "maya-authorization: bearer $JWT_TOKEN" \
  -H "X-APP-PLATFORM: IOS" \
  -H "X-APP-VERSION: 0.9.38" \
  -H "X-APP-ENVIRONMENT:" \
  -H "X-APP-BUILD-NO: 1203" \
  -H "X-APP-RELEASE-NO: 25.5.0" \
  -H "X-APP-SESSION-TRACE-ID: amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=" \
  -H "x-mb-client-adapter: mae-favorites-bill-payment-inquiry" \
  -H "X-MB-E2E-Id: amI4ZUo4czNQQ1RjbnM3TVE0VGtHWVlubUZDWWtNdkI=" \
  -H "X-MB-Timestamp: $(date +%s)000" \
  -H "X-MB-ENV: S" \
  -H "X-MB-Client-Id: mae-fe-iv5p7" \
  -v \
  --connect-timeout 30 \
  --max-time 60

echo ""
echo "========================================================"
echo "✅ Curl request completed"