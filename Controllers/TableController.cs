using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.SqlServer.Management.Common;
using Microsoft.SqlServer.Management.Smo;
using System.Collections;
using System.IO;

namespace SQLRestC.Controllers
{
    [Authorize]
    [ApiController]
    [Route(Global.ROOT+"{database}/{schema}/table")]
    public class TableController : ControllerBase
    {
        //list all Table info
        [HttpGet]
        public ResponseJson GetAll(String database, String schema, bool detail = false)
        {
            Server server = null;
            try
            {
                server = new Server(new ServerConnection(Global.server, Global.username, Global.password));
                var db = server.Databases[database];
                var response = new ResponseJson { success = (db != null) };
                if (response.success)
                {
                    response.success= db.Schemas.Contains(schema);
                    if (response.success)
                    {
                        response.result = Global.getTableInfo(db,schema, detail);
                    }else response.result = "Schema '" + database+"."+schema + "' not found!";
                } else response.result = "Database '" + database + "' not found!";
                return response;

            }
            catch (Exception ex)
            {
                return new ResponseJson { success = false, result = ex.InnerException == null ? ex.Message : (ex.InnerException.InnerException == null ? ex.InnerException.Message : ex.InnerException.InnerException.Message) };
            }
            finally
            {
                if (server != null) server.ConnectionContext.Disconnect();
            }

        }

        //get Table info by name
        [HttpGet("{name}")]
        public ResponseJson Get(String database, String schema, String name,bool detail = false)
        {
            Server server = null;
            try
            {
                server = new Server(new ServerConnection(Global.server, Global.username, Global.password));
                var db = server.Databases[database];
                var response = new ResponseJson { success = (db != null) };
                if (response.success)
                {
                    response.success = db.Schemas.Contains(schema);
                    if (response.success)
                    {
                        var obj = db.Tables[name, schema];
                        response.success=(obj!=null);
                        if (response.success)
                        {
                            response.result = new TableJson
                            {
                                id = obj.ID,
                                name = obj.Name,
                                dataUsage = obj.DataSpaceUsed,
                                indexUsage = obj.IndexSpaceUsed,
                                columns = (detail ? Global.getColumnInfo(obj.Columns) : null),
                                path = obj.ExtendedProperties.Contains(Global.MS_PATH) ? (String)obj.ExtendedProperties[Global.MS_PATH].Value : null,
                                alias = obj.ExtendedProperties.Contains(Global.MS_ALIAS) ? (String)obj.ExtendedProperties[Global.MS_ALIAS].Value : null
                            };
                        }
                        else response.result = "Table '" + database + "."+schema + "." + name + "' not found!";
                    }
                    else response.result = "Schema '" + database+"."+name + "' not found!";
                }
                else response.result = "Database '" + database + "' not found!";
                return response;
            }
            catch (Exception ex)
            {
                return new ResponseJson { success = false, result = ex.InnerException == null ? ex.Message : (ex.InnerException.InnerException == null ? ex.InnerException.Message : ex.InnerException.InnerException.Message) };
            }
            finally
            {
                if (server != null) server.ConnectionContext.Disconnect();
            }

        }

        //create Table
        [HttpPost("{name}")]
        public ResponseJson Create(String database,String schema, String name, List<ColumnJson> columns, String? path)
        {
            Server server = null;
            try
            {
                server = new Server(new ServerConnection(Global.server, Global.username, Global.password));
                var db = server.Databases[database];
                var response = new ResponseJson { success = (db != null) };
                if (response.success)
                {
                    response.success = !db.Tables.Contains(name,schema);
                    if (response.success)
                    {
                        var obj = new Table(db, name,schema);
                        foreach (var col in columns)
                        {
                            obj.Columns.Add(Global.makeColumn(col,obj));
                        }
                        obj.Create();
                        if (!String.IsNullOrEmpty(path))
                        {
                            obj.ExtendedProperties.Add(new ExtendedProperty(obj, Global.MS_PATH, path));
                        }
                        response.result = obj.ID;
                    }
                    else response.result = "Table '" + database + "."+schema+"." + name + "' already exists!";
                }
                else response.result = "Database '" + database + "' not found!";
                return response;
            }
            catch (Exception ex)
            {
                return new ResponseJson { success = false, result = ex.InnerException == null ? ex.Message : (ex.InnerException.InnerException == null ? ex.InnerException.Message : ex.InnerException.InnerException.Message) };
            }
            finally
            {
                if (server != null) server.ConnectionContext.Disconnect();
            }
        }

        //rename Table
        [HttpPut("{name}")]
        public ResponseJson Rename(String database, String schema, String name, String newName, String? newPath)
        {
            Server server = null;
            try
            {
                server = new Server(new ServerConnection(Global.server, Global.username, Global.password));
                var db = server.Databases[database];
                var response = new ResponseJson { success = (db != null) };
                if (response.success)
                {
                    var obj = db.Tables[name,schema];
                    response.success = (obj != null);
                    if (response.success)
                    {
                        obj.Rename(newName);
                        if (!String.IsNullOrEmpty(newPath))
                        {
                            var prop = obj.ExtendedProperties[Global.MS_PATH];
                            if(prop == null)
                                obj.ExtendedProperties.Add(new ExtendedProperty(obj, Global.MS_PATH, newPath));
                            else
                                prop.Value = newPath;
                        }
                    }
                    else response.result = "Table '" + database+ "." +schema+ "." + name + "' not found!";
                }
                else response.result = "Database '" + database + "' not found!";
                return response;
            }
            catch (Exception ex)
            {
                return new ResponseJson { success = false, result = ex.InnerException == null ? ex.Message : (ex.InnerException.InnerException == null ? ex.InnerException.Message : ex.InnerException.InnerException.Message) };
            }
            finally
            {
                if (server != null) server.ConnectionContext.Disconnect();
            }
        }

        //drop Table
        [HttpDelete("{name}")]
        public ResponseJson Drop(String database, String schema, String name)
        {
            Server server = null;
            try
            {
                server = new Server(new ServerConnection(Global.server, Global.username, Global.password));
                var db = server.Databases[database];
                var response = new ResponseJson { success = (db != null) };
                if (response.success)
                {
                    var obj = db.Tables[name,schema];
                    response.success = (obj != null);
                    if (response.success)
                    {
                        obj.Drop();
                    }
                    else response.result = "Table '" + database+"."+schema + "." + name + "' not found!";
                }
                else response.result = "Database '" + database + "' not found!";
                return response;
            }
            catch (Exception ex)
            {
                return new ResponseJson { success = false, result = ex.InnerException == null ? ex.Message : (ex.InnerException.InnerException == null ? ex.InnerException.Message : ex.InnerException.InnerException.Message) };
            }
            finally
            {
                if (server != null) server.ConnectionContext.Disconnect();
            }
        }
    }
}
