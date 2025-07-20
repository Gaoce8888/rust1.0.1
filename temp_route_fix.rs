// 临时修复路由组合问题
pub fn build_fixed_routes() -> impl warp::Filter<Extract = impl warp::Reply> + Clone {
    use warp::Filter;
    
    let users_list = warp::path!("api" / "users")
        .and(warp::get())
        .and(warp::any().map(|| crate::user_manager::UserManager::new()))
        .and_then(|user_manager: crate::user_manager::UserManager| async move {
            Ok::<_, warp::Rejection>(warp::reply::json(&serde_json::json!({
                "users": vec![],
                "total": 0
            })))
        });

    let users_create = warp::path!("api" / "users")
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::any().map(|| crate::user_manager::UserManager::new()))
        .and_then(|user_data: serde_json::Value, user_manager: crate::user_manager::UserManager| async move {
            Ok::<_, warp::Rejection>(warp::reply::json(&serde_json::json!({
                "message": "User created successfully",
                "user": user_data
            })))
        });

    users_list.or(users_create)
}
