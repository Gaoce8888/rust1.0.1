use warp::Filter;
use crate::types::AppUserInfo;
use crate::message::UserType;

/// 用户信息提取器
#[allow(dead_code)]
pub fn extract_user_info(
) -> impl Filter<Extract = (AppUserInfo,), Error = warp::Rejection> + Clone {
    warp::header::<String>("user-id")
        .and(warp::header::optional::<String>("user-name"))
        .and(warp::header::optional::<String>("user-type"))
        .and_then(
            |user_id: String, user_name: Option<String>, user_type: Option<String>| async move {
                let user_type = match user_type.as_deref() {
                    Some("kefu") => UserType::Kefu,
                    Some("kehu") => UserType::Kehu,
                    _ => UserType::Kehu,
                };

                Ok::<AppUserInfo, warp::Rejection>(AppUserInfo {
                    id: user_id,
                    name: user_name.unwrap_or_else(|| "匿名用户".to_string()),
                    user_type,
                })
            },
        )
}

/// 可选的用户信息提取器（用于无需认证的接口）
#[allow(dead_code)]
pub fn extract_optional_user_info(
) -> impl Filter<Extract = (Option<AppUserInfo>,), Error = warp::Rejection> + Clone {
    warp::header::optional::<String>("user-id")
        .and(warp::header::optional::<String>("user-name"))
        .and(warp::header::optional::<String>("user-type"))
        .and_then(
            |user_id: Option<String>, user_name: Option<String>, user_type: Option<String>| async move {
                if let Some(user_id) = user_id {
                    let user_type = match user_type.as_deref() {
                        Some("kefu") => UserType::Kefu,
                        Some("kehu") => UserType::Kehu,
                        _ => UserType::Kehu,
                    };

                    Ok::<Option<AppUserInfo>, warp::Rejection>(Some(AppUserInfo {
                        id: user_id,
                        name: user_name.unwrap_or_else(|| "匿名用户".to_string()),
                        user_type,
                    }))
                } else {
                    Ok::<Option<AppUserInfo>, warp::Rejection>(None)
                }
            },
        )
} 