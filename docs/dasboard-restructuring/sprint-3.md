I want you to create the activity level drill down page showing activity details, targets, and progress.

here is the api reponse for the activity details: make sure you maintain the same design principles as the project and org level pages, with a clear breadcrumb at the top and a consistent card/table layout for the data.
no icons or colors needed, just focus on the structure and data presentation.

{
"data": {
"pattern_type": "daily_attendance",
"activity": {
"id": "09faacb8-b44f-51bd-90bf-17257f2b772f",
"name": "Daily Attendance (CFS)",
"code": "CFS_ATTENDANCE",
"target_count": 400,
"target_unit": "children"
},
"summary": {
"unique_children": 182,
"target": 400,
"percentage": 45,
"girls": 60,
"boys": 122,
"with_disability": 60,
"new_this_period": 182
},
"attendance": {
"total_sessions": 17,
"total_present": 752,
"total_absent": 150,
"attendance_rate": 83
},
"daily_trend": [
{
"date": "2026-04-01",
"present": 150,
"absent": 30
},
{
"date": "2026-04-02",
"present": 150,
"absent": 30
},
{
"date": "2026-04-03",
"present": 150,
"absent": 30
},
{
"date": "2026-04-07",
"present": 150,
"absent": 30
},
{
"date": "2026-04-08",
"present": 150,
"absent": 30
},
{
"date": "2026-04-12",
"present": 2,
"absent": 0
}
],
"by_location": [
{
"location_id": "dd000001-c000-0000-0000-000000000002",
"location_name": "CFS Bor Town",
"unique": 60,
"girls": 20,
"boys": 40,
"disability": 20,
"sessions_held": 5,
"avg_daily_present": 50
},
{
"location_id": "dd000001-c000-0000-0000-000000000001",
"location_name": "CFS Juba Central",
"unique": 60,
"girls": 20,
"boys": 40,
"disability": 20,
"sessions_held": 5,
"avg_daily_present": 50
},
{
"location_id": "dd000001-c000-0000-0000-000000000003",
"location_name": "CFS Malakal Sector 1",
"unique": 60,
"girls": 20,
"boys": 40,
"disability": 20,
"sessions_held": 5,
"avg_daily_present": 50
},
{
"location_id": "f6511e19-13df-4366-98fe-b560a3e2cbc6",
"location_name": "Hamilton Peck",
"unique": 1,
"girls": 0,
"boys": 1,
"disability": 0,
"sessions_held": 1,
"avg_daily_present": 1
},
{
"location_id": "6dd3ee07-9dbf-4b78-90df-dde938705744",
"location_name": "Sean Pugh",
"unique": 1,
"girls": 0,
"boys": 1,
"disability": 0,
"sessions_held": 1,
"avg_daily_present": 1
}
],
"recent_sessions": [
{
"id": "a58aa920-f97e-4b00-a097-bc9027260ab9",
"date": "2026-04-12",
"location_name": "Sean Pugh",
"present": 1,
"absent": 0,
"total": 1
},
{
"id": "0231994e-d366-40e1-a93b-a58e1bfe2824",
"date": "2026-04-12",
"location_name": "Hamilton Peck",
"present": 1,
"absent": 0,
"total": 1
},
{
"id": "5077a91c-5420-5c75-8cf3-bdcebd899154",
"date": "2026-04-08",
"location_name": "CFS Malakal Sector 1",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "e66ad955-f1fa-5457-a882-b99eae946e9a",
"date": "2026-04-08",
"location_name": "CFS Bor Town",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "b8a6ffb4-6303-5fb4-897f-12a73c5d944a",
"date": "2026-04-08",
"location_name": "CFS Juba Central",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "befe86c3-3727-5553-8d69-5fdd402e7f29",
"date": "2026-04-07",
"location_name": "CFS Bor Town",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "575456d9-66fe-5062-afe7-c0de3213e0e6",
"date": "2026-04-07",
"location_name": "CFS Juba Central",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "a81687f0-7c66-52da-bf2d-2284e370e61b",
"date": "2026-04-07",
"location_name": "CFS Malakal Sector 1",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "11ebd6f6-dab4-5b4a-8098-89252190387a",
"date": "2026-04-03",
"location_name": "CFS Bor Town",
"present": 50,
"absent": 10,
"total": 60
},
{
"id": "da18585b-386e-5e9e-8f0b-e517ceb42cdf",
"date": "2026-04-03",
"location_name": "CFS Juba Central",
"present": 50,
"absent": 10,
"total": 60
}
]
}
}
