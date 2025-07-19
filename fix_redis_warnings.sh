#!/bin/bash

echo "🔧 修复Redis类型注解警告..."

# 修复src/auth/kefu_auth.rs中的Redis类型注解
echo "📝 修复kefu_auth.rs中的Redis类型注解..."

# 修复assign_kefu_for_customer函数中的set_ex调用
sed -i 's/conn.set_ex(&customer_key, &kefu.kefu_id, 3600).await?;/conn.set_ex::<_, _, ()>(&customer_key, &kefu.kefu_id, 3600).await?;/g' src/auth/kefu_auth.rs

# 修复increment_kefu_customers函数中的set_ex调用
sed -i 's/conn.set_ex(&key, updated_json, 3600).await?;/conn.set_ex::<_, _, ()>(&key, updated_json, 3600).await?;/g' src/auth/kefu_auth.rs

# 修复release_kefu_for_customer函数中的del调用
sed -i 's/conn.del(&customer_key).await?;/conn.del::<_, ()>(&customer_key).await?;/g' src/auth/kefu_auth.rs

echo "✅ Redis类型注解警告修复完成！"