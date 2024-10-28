import sys,os,aiosqlite,json

from server import PromptServer
from aiohttp import web

ROOT_PATH = os.path.dirname(__file__)
sys.path.append(ROOT_PATH)

WEB_DIRECTORY = "./script"

__all__ =["WEB_DIRECTORY"]

routes = PromptServer.instance.routes
@routes.get("/water_miner/database")
async def select_database(request):
    input = request.query.get('name')
    SQL=f'''
SELECT 
    t.id, t.name, t.category, t.post_count,

    CASE 
        WHEN t.name = '{input}' THEN 1000 * t.post_count
        WHEN t.name LIKE '{input}%' AND t.category = 0 THEN 100 * t.post_count
        WHEN t.name LIKE '%{input}%' AND t.category = 0 THEN 50 * t.post_count
        WHEN t.name LIKE '{input}%' AND t.category IN (1, 3, 4) THEN 10 * t.post_count
        WHEN t.name LIKE '%{input}%' AND t.category IN (1, 3, 4) THEN 1 * t.post_count
        WHEN t.name LIKE '{input}%' AND t.category = 5 THEN 1 * t.post_count
        WHEN t.name LIKE '%{input}%' AND t.category = 5 THEN 1 * t.post_count
        WHEN alias.name = '{input}' THEN 100 * t.post_count
        WHEN alias.name LIKE '{input}%' THEN 10 * t.post_count
        WHEN alias.name LIKE '%{input}%' THEN 1 * t.post_count
    END AS weight,

    CASE 
        WHEN t.name NOT LIKE '%{input}%' AND alias.name IS NOT NULL THEN alias.name
        ELSE NULL 
    END AS alias

FROM 
    Tag t
LEFT JOIN 
    TagAlias alias ON t.id = alias.consequent_id 
    AND (alias.name = '{input}' 
        OR alias.name LIKE '{input}%' 
        OR alias.name LIKE '%{input}%')
                         
WHERE 
    t.name LIKE '%{input}%' 
    OR alias.consequent_id IS NOT NULL

ORDER BY 
    weight DESC
LIMIT 10;

    '''
    async with aiosqlite.connect(f"{ROOT_PATH}/danbooru_tag_db/database.db") as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(SQL)
        rows = await cur.fetchall()
        result = [dict(row) for row in rows]
    body = json.dumps(result)
    return web.Response(body=body,status=200)
