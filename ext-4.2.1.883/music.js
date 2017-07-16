Ext.Loader.setConfig({
    enabled: true,
    paths: {
        'spider.ux': 'ui'
    }
});


Ext.onReady(function() {


    var fromDic = {
        "Baidu": "百度",
        "Netease": "网易",
        "QQ": "QQ云",
        "Xiami": "虾米",
        "Kuwo": "酷我",
        "Kugou": "酷狗",
        "Migu": "咪咕"
    };

    var Myplayer = window.Myplayer = new APlayer({
        element: document.getElementById('myplayer'),
        narrow: false,
        autoplay: true,
        showlrc: 3,
        mutex: true,
        theme: '#e6d0b2',
        preload: 'metadata',
        mode: 'circulation',
        music: {
            title: '童话镇',
            author: '陈一发儿',
            url: 'mp3/童话镇_陈一发儿.mp3',
            pic: 'imgs/童话镇_陈一发儿.jpg',
            lrc: 'lrc/童话镇_陈一发儿.lrc'
        }
    });


    Ext.define('songmodel', {
        extend: 'Ext.data.Model',
        fields: [
            "songname", "singername", "albumname", "from", "id", {
                name: 'params' //,
                    // convert: convert
            }
        ],
        idProperty: 'id'
    });

    var store = Ext.create('Ext.data.Store', {
        pageSize: 50,
        model: 'songmodel',
        remoteSort: true,
        proxy: {
            type: 'ajax',
            url: '/list',
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

    var _keyword = "",
        _selectfrom = "Kugou,Kuwo,Xiami,Migu,QQ,Netease,Baidu",
        _menu = "";
    store.on('beforeload', function(store, options) {
        var _params = {
            "keyword": _keyword,
            "from": _selectfrom,
            "menu": _menu
        };
        Ext.apply(store.proxy.extraParams, _params);
    });

    var grid = Ext.create('Ext.grid.Panel', {
        store: store,
        disableSelection: false,
        columnLines: true,
        loadMask: true,
        region: 'center',
        selModel: Ext.create('Ext.selection.CheckboxModel', {
            checkOnly: false
        }),
        dockedItems: [{
            xtype: 'toolbar',
            dock: 'top',
            items: ['歌曲名：', {
                xtype: 'textfield',
                id: 'keyword',
                width: 250,
                emptyText: '输入歌曲名',
                listeners: {
                    specialkey: function(field, e) {
                        if (e.getKey() == Ext.EventObject.ENTER) {
                            _keyword = Ext.getCmp("keyword").getValue();
                            var groupvalue = Ext.getCmp("music_from").getValue().rb1;
                            _selectfrom = Array.isArray(groupvalue) ? groupvalue.join(",") : groupvalue;
                            store.loadPage(1);
                        }
                    }
                }
            }, {
                xtype: 'button',
                text: '搜索',
                listeners: {
                    click: function() {
                        _keyword = Ext.getCmp("keyword").getValue();
                        var groupvalue = Ext.getCmp("music_from").getValue().rb1;
                        _selectfrom = Array.isArray(groupvalue) ? groupvalue.join(",") : groupvalue;
                        store.loadPage(1);
                    }
                }
            }, {
                xtype: 'tbspacer',
                width: 10
            }, {
                xtype: 'tbseparator'
            }, '来源：', {
                xtype: 'checkboxgroup',
                id: "music_from",
                width: 300,
                items: [{
                    boxLabel: '酷狗',
                    name: 'rb1',
                    inputValue: 'Kugou',
                    checked: true
                }, {
                    boxLabel: '酷我',
                    name: 'rb1',
                    inputValue: 'Kuwo',
                    checked: true
                }, {
                    boxLabel: '虾米',
                    name: 'rb1',
                    inputValue: 'Xiami',
                    checked: true
                }, , {
                    boxLabel: '咪咕',
                    name: 'rb1',
                    inputValue: 'Migu',
                    checked: true
                }, {
                    boxLabel: 'QQ',
                    name: 'rb1',
                    inputValue: 'QQ',
                    checked: true
                }, {
                    boxLabel: '网易',
                    name: 'rb1',
                    inputValue: 'Netease',
                    checked: true
                }, {
                    boxLabel: '百度',
                    name: 'rb1',
                    inputValue: 'Baidu',
                    checked: true
                }]
            }]
        }],
        viewConfig: {
            trackOver: true,
            stripeRows: true
        },
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
            xtype: 'actiontextcolumn',
            text: '下载',
            width: 80,
            items: [{
                text: "歌曲",
                handler: function(grid, rowIndex, colIndex, node, e, record, rowEl) {
                    document.getElementById("downloadIframe").src = "/downloadUrl?data=" + escape(JSON.stringify(record.data));
                }
            }, {
                text: "歌词",
                handler: function(grid, rowIndex, colIndex, node, e, record, rowEl) {
                    document.getElementById("downloadIframe").src = "/downloadLrcUrl?data=" + escape(JSON.stringify(record.data));
                }
            }]
        }],
        listeners: {
            itemdblclick: function(view, record, item, index, e, eOpts) {
                //console.dir(record.data);

                /*
                Ext.Ajax.request({
                    url: '/getPlayUrl',
                    method: 'POST',
                    params: {
                        data: JSON.stringify(record.data)
                    },
                    success: function(response) {
                        var url = response.responseText;
                        if (record.data.from == "Baidu") {
                            url = "/getBaiduPlayStream?url=" + url;
                        }
                        Myplayer.addMusic([{
                            title: record.data.songname + "----" + record.data.albumname,
                            author: record.data.singername,
                            url: url,
                            lrc: "/downloadLrcUrl?data=" + escape(JSON.stringify(record.data)),
                            pic: "/getImgUrl?data=" + escape(JSON.stringify(record.data))
                        }]);

                        Myplayer.setMusic(Ext.query(".aplayer-list li").length - 1);

                    },
                    failure: function(response, options) {

                    }
                });*/

                Myplayer.addSongs([record.data]);



            }
        },
        bbar: Ext.create('Ext.PagingToolbar', {
            store: store,
            displayInfo: true
        })
    });
    store.loadPage(1);


    grid.on('itemcontextmenu', function(view, record, item, index, e, eOpts) {
        e.preventDefault();
        e.stopEvent();

        var rightMenu = new Ext.menu.Menu({
            items: [{
                text: '增加到下载列表',
                handler: function() {

                    if (grid.getSelectionModel().getSelection().length == 0) {
                        Ext.Msg.alert('提示', '未选择!!');
                        return;
                    }

                    var _datas = [];
                    Ext.each(grid.getSelectionModel().getSelection(), function(item, index) {
                        item.data["progress"] = 0;
                        //item.data["complete"] = 0;
                        item.data["status"] = "等待中";
                        _datas.push(item.data);
                    });

                    Ext.Ajax.request({
                        url: '/downloadsave',
                        method: 'POST',
                        params: {
                            data: JSON.stringify(_datas)
                        },
                        success: function(response) {
                            var url = response.responseText;
                            if (downloadTabPanel != null) downloadTabPanel.reload();

                        },
                        failure: function(response, options) {

                        }
                    });


                }
            }, {
                text: '增加到播放列表',
                handler: function() {

                    if (grid.getSelectionModel().getSelection().length == 0) {
                        Ext.Msg.alert('提示', '未选择!!');
                        return;
                    }

                    var _datas = [];
                    Ext.each(grid.getSelectionModel().getSelection(), function(item, index) {
                        _datas.push(item.data);
                    });

                    Myplayer.addSongs(_datas);

                }
            }, {
                text: '全不选',
                handler: function() {
                    alert(record.raw.id);
                }
            }]
        });

        rightMenu.showAt(e.getXY());

    });



    var mainTabPanel = null,
        downloadTabPanel = null;
    var viewport = Ext.create('Ext.Viewport', {
        layout: 'border',
        items: [
            mainTabPanel = Ext.create('Ext.tab.Panel', {
                region: 'center',
                title: 'Music Spider',
                tabPosition: 'top',
                items: [{
                    title: "找歌",
                    layout: 'border',
                    items: [{
                        region: 'west',
                        xtype: 'treepanel',
                        title: '菜单',
                        width: 150,
                        height: 150,
                        collapsible: true,
                        split: true,
                        animCollapse: true,
                        store: Ext.create('Ext.data.TreeStore', {
                            root: {
                                expanded: true,
                                children: [{
                                    text: "排行榜",
                                    expanded: true,
                                    children: [{
                                        text: "酷我畅销榜",
                                        leaf: true
                                    }, {
                                        text: "QQ巅峰榜·热歌",
                                        leaf: true
                                    }]
                                }]
                            }
                        }),
                        rootVisible: false,
                        listeners: {
                            itemclick: function(view, record, item, index, e, eOpts) {
                                var text = record.get('text');
                                _menu = text;
                                _keyword = "";
                                store.loadPage(1);

                            }
                        }
                    }, grid]
                }],
                tools: [{
                    xtype: 'button',
                    text: '批量下载',
                    listeners: {
                        click: function() {
                            if (downloadTabPanel == null) {
                                Ext.require('spider.ux.SongDownPanel', function() {
                                    downloadTabPanel = Ext.create('spider.ux.SongDownPanel', {
                                        listeners: {
                                            close: function(tab, eOpts) {
                                                tab.closesocket();
                                                downloadTabPanel = null;
                                            }
                                        }
                                    });
                                    mainTabPanel.add(downloadTabPanel);
                                    mainTabPanel.setActiveTab(downloadTabPanel);
                                });
                            }
                            mainTabPanel.setActiveTab(downloadTabPanel);
                        }
                    }
                }, {
                    xtype: 'tbspacer',
                    width: 10
                }]
            }), {
                region: 'south',
                contentEl: 'myplayer',
                split: true,
                height: 200,
                minSize: 100,
                maxSize: 200,
                collapsible: true,
                collapsed: false,
                margins: '0 0 0 0'
            }
        ]
    });

});