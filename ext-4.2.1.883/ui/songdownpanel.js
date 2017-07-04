Ext.define('spider.ux.SongDownPanel', {
    extend: 'Ext.panel.Panel',
    title: '批量下载',
    layout: 'border',
    //modal: true,
    closable: true,
    initComponent: function(cfg) {
        var me = this;
        Ext.define('songdownmodel', {
            extend: 'Ext.data.Model',
            fields: [
                "songname", "singername", "albumname", "from", "id", "status", {
                    name: 'params'
                }, "progress"
            ],
            idProperty: 'id'

        });

        var downstore = Ext.create('Ext.data.Store', {
            pageSize: 50,
            model: 'songdownmodel',
            remoteSort: true,
            proxy: {
                type: 'ajax',
                url: '/listdownlist',
                disableCaching: false,
                reader: {
                    root: 'datas',
                    totalProperty: 'total'
                },
                simpleSortMode: true
            },
            sorters: [{
                property: 'salary',
                direction: 'ASC' //DESC
            }]
        });

        downstore.on('beforeload', function(store, options) {
            var _params = {};
            Ext.apply(store.proxy.extraParams, _params);

        });

        var fromDic = {
            "Baidu": "百度",
            "Netease": "网易",
            "QQ": "QQ云",
            "Xiami": "虾米",
            "Kuwo": "酷我",
            "Kugou": "酷狗",
            "Migu": "咪咕"
        };

        var downgrid = Ext.create('Ext.grid.Panel', {
            store: downstore,
            disableSelection: false,
            loadMask: true,
            region: 'center',
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                checkOnly: false
            }),
            viewConfig: {
                trackOver: true,
                stripeRows: true

            },
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [{
                    xtype: 'button',
                    text: '开始下载',
                    listeners: {
                        click: function() {
                            Ext.Ajax.request({
                                url: '/downloadstart',
                                method: 'POST',
                                params: {
                                    // data: JSON.stringify(_datas)
                                },
                                success: function(response) {
                                    var url = response.responseText;

                                },
                                failure: function(response, options) {

                                }
                            });
                        }
                    }
                }]
            }],

            columns: [{
                text: "序号",
                xtype: "rownumberer",
                width: 35,
                align: "center"
            }, {
                text: "歌名",
                dataIndex: 'songname',
                width: 200,
                sortable: false
            }, {
                text: "歌者",
                dataIndex: 'singername',
                width: 100,
                sortable: true
            }, {
                text: "专辑",
                dataIndex: 'albumname',
                width: 200,
                sortable: true
            }, {
                text: "来源",
                dataIndex: 'from',
                renderer: function(val) {
                    return fromDic[val];
                },
                width: 50,
                sortable: true
            }, {
                xtype: 'progresscolumn',
                text: "下载进度",
                dataIndex: 'progress',
                width: 150
            }, {
                xtype: 'statuscolumn',
                text: "状态",
                dataIndex: 'status',
                width: 50
            }],
            listeners: {
                itemclick: function(view, record, item, index, e, eOpts) {

                }
            },
            bbar: Ext.create('Ext.PagingToolbar', {
                store: downstore,
                displayInfo: true
            })
        });



        downgrid.on('itemcontextmenu', function(view, record, item, index, e, eOpts) {
            e.preventDefault();
            e.stopEvent();

            var rightMenu = new Ext.menu.Menu({
                items: [{
                    text: '重新下载',
                    handler: function() {

                        if (downgrid.getSelectionModel().getSelection().length == 0) {
                            Ext.Msg.alert('提示', '未选择!!');
                            return;
                        }

                        if (downgrid.getSelectionModel().getSelection().length != 1) {
                            Ext.Msg.alert('提示', '请选择一个!!');
                            return;
                        }
                        var _datas = [];
                        Ext.each(downgrid.getSelectionModel().getSelection(), function(item, index) {
                            _datas.push(item.data);
                        });

                        console.dir(_datas[0]);

                        Ext.Ajax.request({
                            url: '/restartdownload',
                            method: 'POST',
                            params: {
                                data: JSON.stringify(_datas[0])
                            },
                            success: function(response) {
                                var url = response.responseText;

                            },
                            failure: function(response, options) {

                            }
                        });


                    }
                }, {
                    text: '暂停下载',
                    handler: function() {
                        if (downgrid.getSelectionModel().getSelection().length == 0) {
                            Ext.Msg.alert('提示', '未选择!!');
                            return;
                        }

                        var _datas = [];
                        Ext.each(downgrid.getSelectionModel().getSelection(), function(item, index) {
                            item.data["progress"] = 0;
                            item.data["complete"] = 0;
                            _datas.push(item.data);
                        });

                        Ext.Ajax.request({
                            url: '/downloadstop',
                            method: 'POST',
                            params: {
                                data: JSON.stringify(_datas)
                            },
                            success: function(response) {
                                var url = response.responseText;

                            },
                            failure: function(response, options) {

                            }
                        });
                    }
                }]
            });

            rightMenu.showAt(e.getXY());

        });


        downstore.loadPage(1);
        me.items = [downgrid];
        me.callParent();

        me.reload=function(){
            downstore.loadPage(1);
        }

        me.socket = io({
            autoConnect: false
        });
        me.socket.on('connect', function() {
            console.log("connect to server....");
        });

        me.socket.on('changestatus', function(upobjs) {

            Object.keys(upobjs).forEach(function(key, index, array) {
                Ext.get(key + "_a").update(upobjs[key]["progress"] + "%");
                Ext.get(key + "_c").update(upobjs[key]["progress"] + "%");
                Ext.get(key + "_b").setStyle("width", upobjs[key]["progress"] + "%");
                Ext.get(key + "_s").update(upobjs[key]["status"]);
            });

            //Ext.require(['App.ux.MusicWin']);

            // console.dir(msg);
        });
        me.socket.on('event', function(data) {});
        me.socket.on('disconnect', function() {});
        me.socket.on('error', function(error) {

        });

        me.closesocket = function() {
            me.socket.close();
        }
        me.socket.open();
    }
});