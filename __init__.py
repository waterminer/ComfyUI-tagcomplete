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
SELECT name,category,post_count FROM Tag WHERE name LIKE '{input}%'
UNION
SELECT name,category,post_count FROM Tag WHERE name LIKE '%{input}%'
ORDER BY Tag.post_count DESC
LIMIT 10
    '''
    async with aiosqlite.connect("./danbooru_tag_db/database.db") as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(SQL)
        rows = await cur.fetchall()
        result = [dict(row) for row in rows]
    body = json.dumps(result)
    return web.Response(body=body,status=200)
