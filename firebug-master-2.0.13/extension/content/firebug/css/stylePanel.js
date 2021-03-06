/* See license.txt for terms of usage */

define([
    "firebug/firebug",
    "firebug/lib/array",
    "firebug/lib/css",
    "firebug/lib/dom",
    "firebug/lib/domplate",
    "firebug/lib/events",
    "firebug/lib/fonts",
    "firebug/lib/locale",
    "firebug/lib/object",
    "firebug/lib/options",
    "firebug/lib/string",
    "firebug/lib/url",
    "firebug/lib/xpath",
    "firebug/lib/xpcom",
    "firebug/chrome/firefox",
    "firebug/chrome/menu",
    "firebug/chrome/reps",
    "firebug/css/cssModule",
    "firebug/css/cssPanel",
    "firebug/css/cssReps",
    "firebug/css/loadHandler",
    "firebug/debugger/script/sourceLink",
    "firebug/newland/constant",
],
function(Firebug, Arr, Css, Dom, Domplate, Events, Fonts, Locale, Obj, Options, Str, Url, Xpath,
    Xpcom, Firefox, Menu, FirebugReps, CSSModule, CSSStyleSheetPanel, CSSReps, LoadHandler,
    SourceLink) {

// ********************************************************************************************* //
// Constants

var {domplate, FOR, TAG, DIV, TABLE, TBODY,THEAD, TR, TD,SPAN , H1, P, UL, A, INPUT,BUTTON,SELECT ,OPTION,IMG,BR} = Domplate;

const Cc = Components.classes;
const Ci = Components.interfaces;
const nsIDOMCSSStyleRule = Ci.nsIDOMCSSStyleRule;

// See: http://mxr.mozilla.org/mozilla1.9.2/source/content/events/public/nsIEventStateManager.h#153
const STATE_ACTIVE  = 0x01;
const STATE_FOCUS   = 0x02;
const STATE_HOVER   = 0x04;
// ********************************************************************************************* //
// CSSStylePanel Panel (HTML side panel)

/**
 * @panel Represents the Style side panel available within HTML panel. This panel is responsible
 * for displaying CSS rules associated with the currently selected element in the HTML panel.
 * See more: https://getfirebug.com/wiki/index.php/Style_Side_Panel
 */
 var tbody,pageIdInput,appIdSel,appTypeSel;
var appRows,testTemplate;
var pageNumber = 1;
var appId = 7;
var totalPages = -1;
var nowPage = 1;
var pageSize = 8;
var myDocument;
var pageId = -1;
function CSSStylePanel() {}
CSSStylePanel.prototype = Obj.extend(CSSStyleSheetPanel.prototype,
/** @lends CSSStylePanel */
{
    name: "css",
    parentPanel: "html",
    order: 0,
    tbody:tbody,
    pageIdInput:pageIdInput,
    appIdSel:appIdSel,
    appTypeSel:appTypeSel,
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Initialization
    initialize: function()
    {
        this.onStateChange = Obj.bindFixed(this.contentStateCheck, this);
        this.onHoverChange = Obj.bindFixed(this.contentStateCheck, this, STATE_HOVER);
        this.onActiveChange = Obj.bindFixed(this.contentStateCheck, this, STATE_ACTIVE);

        CSSStyleSheetPanel.prototype.initialize.apply(this, arguments);

				
        /*************初始化table-start**************/
        this.template.cascadedTag.replace({}, this.panelNode,this.template);
        testTemplate = this.template;
        myDocument = this.document;
        tbody = this.document.getElementById('nl_table_panel_body');
        pageIdInput = this.document.getElementById('nl_pageId');
        appIdSel = this.document.getElementById('nl_appId');
        appTypeSel = this.document.getElementById('nl_appType');
        //TODO  ajax请求，加载应用（仅web类型）填充数据
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(event){
			if(xhr.readyState == 4){
				if(xhr.status == 200){
					//alert(200);
					var apps = xhr.responseText;
					apps = eval("("+apps+")");
					appRows = apps.rows;
					//alert(appRows);
					for(var i = 0; i < appRows.length; i ++){
						testTemplate.appsTags.append({object:appRows[i]},appIdSel);
					}
				}
			}
		};
		xhr.open('POST',Locale.$STR("nl.httpUrl") + '/appinfo/getAppInfoList.do',true);
		xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');
		xhr.send("model={'osType':'Web'}");        //发送
        
        myDocument.getElementById("search_div").style.display='none';
        /*************初始化table-end**************/
        // Destroy derived updater for now.
        // xxxHonza: the Style panel could use it too?
        this.updater.destroy();
        this.updater = null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Domplate

    template: domplate(
    {
		changeApp:function(event){
			pageIdInput.value = "";
			pageId = -1;
			pageNumber= 1;
			this.chagePageType();
		},
	  chagePageType:function(event){
			if(appTypeSel.value=='new'){
				pageIdInput.readOnly="";
			  myDocument.getElementById("search_div").style.display='none';
			}else{
			  myDocument.getElementById("search_div").style.display='';
			  this.loadData();
				pageIdInput.readOnly="readonly";
			}
	  },
	  chosePage:function(event){
		if(appTypeSel.value=='old'){
				if(appIdSel.value==''){
					alert(Locale.$STR("nl.tips_requiredApp"));//"请选择所属应用！"
				}else{
					pageId = event.target.id;
					//alert(pageId);
					pageIdInput.value=event.target.pageName;
					 //TODO ajax请求，弹出框选择已有页面--自定义弹出框
					 //alert(appIdSel.value);
					//window.showModalDialog('page.html?appid=' + appIdSel.value,appIdSel.value,'dialogWidth:750px;dialogHeight:430px;center:yes;') ;//status:no;scroll:yes;help:no;

						//window.open('page.html?appid=' + appIdSel.value,"newWindow","width=750,height=430;");
				}
		}
	  },
    /*************删除行数据**************/
		delNode: function(event){
		  var td = event.currentTarget;
		  var tr = td.parentNode.parentNode;
		  //alert(tr.innerHTML);
		  tr.remove();
		},
    /*************提交数据**************/
		    onButtonClick: function(event){
		        //alert(tbody.childNodes);
		        var trArr = tbody.childNodes;
		        var mypageName;
		        if(trArr.length==0){
		      		alert(Locale.$STR("nl.tips_nodata"));
		      		return;
		        }
		        if(appIdSel.value==''){
				    	alert(Locale.$STR("nl.tips_requiredApp"));//"请选择所属应用！"
		      		return;
				    }
		        if(pageIdInput.value){
		        	mypageName = pageIdInput.value;
		        }else{
		        		alert(Locale.$STR("nl.tips_nopagName"));
		        		return;
		        }
		        var appObjects = "[";
		        for(var i=0;i<trArr.length; i++){
		        	//alert(trArr[i].innerHTML);
		        	var tr = trArr[i];
		        	var tdArr = tr.childNodes;
		        	var td_objname = tdArr[0];
		        	var td_id = tdArr[1];
		        	var td_name = tdArr[2];
		        	var td_tagName = tdArr[3];
		        	var td_xpath = tdArr[4];
		        	var td_css = tdArr[5];
		        	appObjects = appObjects + "{'objectName':'" + td_objname.innerHTML + "','byXpath':'" + td_xpath.innerHTML + "','byId':'" + td_id.innerHTML + "',"
		        														+"'byTagname':'" + td_tagName.innerHTML + "','byName':'" + td_name.innerHTML + "','byCss':'" + td_css.innerHTML + "'}";
		        	if(i==(trArr.length-1)){
		        		
		        	}else{
		        		appObjects = appObjects + ",";
		        	}
		        }
		        appObjects = appObjects + "]";
		        //ajax提交数据
				    
					    if(appTypeSel.value=='old'){
				        
				        var postData = "model={'pageId':" + pageId + ",'appObjects':" + appObjects + "}";
				        //alert(postData);
				        //alert(appIdSel.value+","+appTypeSel.value);
				        var xhr = new XMLHttpRequest();        //创建一个ajax对象
						    xhr.onreadystatechange = function(event){    //对ajax对象进行监听
						        if(xhr.readyState == 4){    //4表示解析完毕
						            if(xhr.status == 200){    //200为正常返回
						                //alert(200);
												    alert(Locale.$STR("nl.tips_success"));
												    tbody.innerHTML="";
												    pageIdInput.value = "";
												    pageId = -1;
						            }
						        }
						    };
						    xhr.open('POST',Locale.$STR("nl.httpUrl") + '/page/addPageObject.do',true);    //建立连接，参数一：发送方式，二：请求地址，三：是否异步，true为异步
						    xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');    //可有可无
						    xhr.send(postData);        //发送
						    
		    	  	}else{
		    	  		//1、新增页面，返回页面id
				        var xhr = new XMLHttpRequest();       
						    xhr.onreadystatechange = function(event){ 
						        if(xhr.readyState == 4){    
						            if(xhr.status == 200){
						                //alert(200);
						                var datas = xhr.responseText;  
					                datas = eval("("+datas+")"); 
					                var return_code = datas.return_code;
					                if(return_code==1){
										        var postData = "model={'pageId':" + datas.pageId + ",'appObjects':" + appObjects + "}";
										        //alert(postData);
										        var xhr2 = new XMLHttpRequest();
		    	  							 //2、提交数据，元素入库
												    xhr2.onreadystatechange = function(event){
												        if(xhr2.readyState == 4){
												            if(xhr2.status == 200){
												    						alert(Locale.$STR("nl.tips_success"));
												    						tbody.innerHTML="";
												    						pageIdInput.value = "";
												            }
												        }
												    };
												    xhr2.open('POST',Locale.$STR("nl.httpUrl") + '/page/addPageObject.do',true);
												    xhr2.setRequestHeader('Content-type','application/x-www-form-urlencoded');
												    xhr2.send(postData);
					                }else{
												    alert(Locale.$STR("nl.tips_failed"));
					                }
						            }
						        }
						    };
						    xhr.open('POST',Locale.$STR("nl.httpUrl") + '/page/addPage2.do',true);
						    xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded'); 
						    xhr.send("model={'pageName':'"+pageIdInput.value+"','appId':"+appIdSel.value+",'pageVersion':'1.1.1'}"); 
		    	  	}
            
		    },
		    loadData:function(){
					appId = appIdSel.value;
					//alert(appId);
  				//alert(window.dialogArguments);
			  			var xhr = new XMLHttpRequest();        //创建一个ajax对象
					    xhr.onreadystatechange = function(event){    //对ajax对象进行监听
					        if(xhr.readyState == 4){    //4表示解析完毕
					            if(xhr.status == 200){    //200为正常返回
					                //alert(200);
					                var datas = xhr.responseText;  
					                //alert(datas);
					                datas = eval("("+datas+")"); //这里需注意，后台返回的是纯文本数据而不是json数据，要用eval方法转换成json格式的数据  
					        				//利用后台返回的json数据自动创建节点，采用拼接字符串的方法  
					        				var Rows = datas.rows;
					        				var total = datas.total;
					        				if (total % pageSize == 0) {
														totalPages = total / pageSize;
													} else {
														totalPages = Math.floor(total / pageSize) + 1;
													}
													if(pageNumber==1){
															myDocument.getElementById("before").disabled=true;
														if (pageNumber == totalPages) {//当前页=最大页
															myDocument.getElementById("next").disabled=true;
														}else{
															myDocument.getElementById("next").disabled=false;
														}
													}
													var imageTable = myDocument.getElementById('imageTable');
													testTemplate.addImg.replace({array: Rows}, imageTable , testTemplate);
					        				
					            }
					        }
					    };
					    xhr.open('POST',Locale.$STR("nl.httpUrl") + '/page/getPageList.do',true);    //建立连接，参数一：发送方式，二：请求地址，三：是否异步，true为异步
					    xhr.setRequestHeader('Content-type','application/x-www-form-urlencoded');    //可有可无
					    var pageName = myDocument.getElementById("pageName").value;
					    var postData = "model={'pageName':'"+pageName+"','appId':"+appId+",'pageNumber':"+pageNumber+",'pageSize':" + pageSize + "}"
					    nowPage = pageNumber;
					    //alert(postData);
					    xhr.send(postData);        //发送
		    },
		    searchPage:function(event){
						pageNumber = 1;
						this.loadData();
		    },
		    gotoBefore:function(event){
		    	pageNumber = nowPage - 1;
							myDocument.getElementById("next").disabled=false;
						if (pageNumber == 1) {//当前页=最大页
							myDocument.getElementById("before").disabled=true;
						}else{
							myDocument.getElementById("before").disabled=false;
						}
						this.loadData();
		    },
		    gotoNext:function(event){
		    	pageNumber = nowPage + 1;
						myDocument.getElementById("before").disabled=false;
						if (pageNumber == totalPages) {//当前页=最大页
							myDocument.getElementById("next").disabled=true;
						}else{
							myDocument.getElementById("next").disabled=false;
						}
						this.loadData();
		    },
		    addImg:
		    		FOR("item", "$array",
		    				TD({ondblclick: "$chosePage",_pageName:"$item.pageName",id:"$item.pageId"},
		    					SPAN({id:"$item.pageId",_pageName:"$item.pageName"},"$item.pageName")      
		    				  //DIV("$item.pageName"),
					      	//IMG({ondblclick: "$chosePage",_pageName:"$item.pageName",id:"$item.pageId",src:"$item.pageImage",width:"180px",height:"120px"})        
					      )
					     ),
		    	
    /*************表格头**************/
		    cascadedTag:
		    	DIV({align: "center",display:"inline"},
		    		 DIV(
		    		 	 SPAN(Locale.$STR("nl.tips_writeappId")),
			    		 SELECT({id:"nl_appId",onchange:"$changeApp"}
	             ),
			    		 SPAN(Locale.$STR("nl.tips_writepageType")),
			    		 SELECT({id:"nl_appType",onchange:"$chagePageType"},
	              	OPTION({value:"new"},Locale.$STR("nl.newPage")),//新页面
	              	OPTION({value:"old"},Locale.$STR("nl.oldPage"))//已有页面
	             ),
				       SPAN(Locale.$STR("nl.tips_writepageId")),
				       INPUT({id:'nl_pageId',onclick:"$chosePage"}), 
	        		 BUTTON({class: "green",align: "center",checked: "true",type: "checkbox",onclick: "$onButtonClick"},
	        							Locale.$STR("nl.tips_submit")//提交
	        			)
		    		 ),
        		 DIV({style:"background-color:#ccc",id:"search_div"},
			 	 			 SPAN(Locale.$STR("nl.tips_pageName")),
			 	 			 INPUT({id:"pageName"}),
			 	 			 BUTTON({onclick: "$searchPage"},Locale.$STR("nl.tips_search")),//查询
        		 	 TABLE({border: "1",width: "100%"},
        		 	 	TR({id:"imageTable"})
        		 	 ),//image
        		 	 DIV(
        		 	 		BUTTON({id:"before",onclick:"$gotoBefore"},Locale.$STR("nl.tips_before")),//上一页
        		 	 		BUTTON({id:"next",onclick:"$gotoNext"},Locale.$STR("nl.tips_next"))//下一页
        		 	 )
        		 ),
			       TABLE({id:'nl_table_panel',border: "1", width: "90%",align: "center"},
			       		THEAD(
			          	TR({align: "center",color:"red"},
			              TD({align: "center",color:"red"},Locale.$STR("nl.domName")),
			              TD({align: "center",color:"red"},"id"),
			              TD({align: "center",color:"red"},"name"),
			              TD({align: "center",color:"red"},"className"),
			              TD({align: "center",color:"red"},Locale.$STR("nl.xpath")),
			              TD({align: "center",color:"red"},Locale.$STR("nl.cssSelector")),
							TD({align: "center",color:"red"},'iframePath'),
							TD({align: "center",color:"red"},Locale.$STR("nl.action"))
			             )
			       		),
			          TBODY({id:'nl_table_panel_body'})
			         )
		         ),
    /*************表格内容**************/
		    cascadedTag2:
		          TR({align: "center"},
		              TD("$object.nodeName"),
		              TD("$object.id"),
		              TD("$object.name"),
		              TD("$object.className"),
		              TD("$object.xpath"),
		              TD("$object.cssSelector"),
					  TD("$object.myPath"),
		              TD(DIV({onclick:"$delNode"},Locale.$STR("nl.delete")))
		           ),
        appsTags:
              OPTION({value:"$object.appId"},"$object.appName"),
        		
        ruleTag:
            DIV({"class": "cssElementRuleContainer"},
                TAG(CSSReps.CSSStyleRuleTag.tag, {rule: "$rule"}),
                TAG(FirebugReps.SourceLink.tag, {object: "$rule.sourceLink"})
            ),

        newRuleTag:
            DIV({"class": "cssElementRuleContainer"},
                DIV({"class": "cssRule insertBefore", style: "display: none"}, "")
            ),

        CSSFontPropValueTag:
                FOR("part", "$propValueParts",
                    SPAN({"class": "$part.type|getClass", _repObject: "$part"}, "$part.value"),
                    SPAN({"class": "cssFontPropSeparator"}, "$part|getSeparator")
                ),

        getSeparator: function(part)
        {
            if (part.lastFont || part.type == "important")
                return "";

            if (part.type == "otherProps")
                return " ";

            return ",";
        },

        getClass: function(type)
        {
            switch (type)
            {
                case "used":
                    return "cssPropValueUsed";

                case "unused":
                    return "cssPropValueUnused";

                default:
                    return "";
            }
        },
    /*************更新table表格，添加行数据**************/
    updateTable : function(object){
		var path = '';
        var tag;
		for(var i=0; i<NLConstant.currrentObjectPath.length;i++){
            tag = NLConstant.currrentObjectPath[i].tagName.toLowerCase();
            if(tag == "iframe" || tag == "frame"){
                tag = Xpath.getElementXPath(NLConstant.currrentObjectPath[i]);
                path =  path + tag + "<";
            }
		}
        object.myPath=path;
		this.cascadedTag2.insertRows({object:object},  tbody);
    	}
    }),
    

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    updateCascadeView: function(element)
    {
        //删除更新界面，每次都会被刷新掉
        
    },

    getStylesheetURL: function(rule, getBaseUri)
    {
        // If parentStyleSheet.href is null, then per the CSS standard this is an inline style.
        if (rule && rule.parentStyleSheet && rule.parentStyleSheet.href)
            return rule.parentStyleSheet.href;
        else if (getBaseUri)
            return this.selection.ownerDocument.baseURI;
        else
            return this.selection.ownerDocument.location.href;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    getInheritedRules: function(element, sections, usedProps)
    {
        var parent = element.parentNode;
        if (parent && parent.nodeType == Node.ELEMENT_NODE)
        {
            this.getInheritedRules(parent, sections, usedProps);

            var rules = [];
            this.getElementRules(parent, rules, usedProps, true);

            if (rules.length)
                sections.unshift({element: parent, rules: rules});
        }
    },

    getElementRules: function(element, rules, usedProps, inheritMode)
    {
        function filterMozPseudoElements(pseudoElement)
        {
            return !Str.hasPrefix(pseudoElement, "::-moz");
        }

        var pseudoElements = [""];
        var inspectedRules, displayedRules = {};

        // Add pseudo-elements
        if (!inheritMode)
        {
            pseudoElements = Arr.extendArray(pseudoElements, Css.pseudoElements);

            // xxxsz: Do not show Mozilla-specific pseudo-elements for now (see issue 6451)
            // Pseudo-element rules just apply to specific elements, so we need a way to find out
            // which elements that are
            pseudoElements = pseudoElements.filter(filterMozPseudoElements);

            // XXXsimon: these are too nice to ignore, but stash them to the bottom of the
            // section for now so that e.g. a rule with selector "*::-moz-selection" doesn't
            // get in the way of more element-specific ones (see issue 6480). This should
            // be improved in the future when we do issue 6457 and/or add the ability to figure
            // out which pseudo-elements are actually applicable. (see https://bugzil.la/874227)
            pseudoElements.unshift("::-moz-placeholder");
            pseudoElements.unshift("::-moz-selection");
        }

        // The domUtils API requires the pseudo-element selectors to be prefixed by only one colon
        pseudoElements.forEach(function(pseudoElement, i)
        {
            if (Str.hasPrefix(pseudoElement, "::"))
                pseudoElements[i] = pseudoElement.substr(1);
        });

        for (var p in pseudoElements)
        {
            try
            {
                inspectedRules = Dom.domUtils.getCSSStyleRules(element, pseudoElements[p]);
            }
            catch (exc)
            {
                continue;
            }

            if (!inspectedRules)
                continue;

            for (var i = 0; i < inspectedRules.Count(); ++i)
            {
                var rule = Xpcom.QI(inspectedRules.GetElementAt(i), nsIDOMCSSStyleRule);
                var isSystemSheet = Url.isSystemStyleSheet(rule.parentStyleSheet);

                var props = this.getRuleProperties(this.context, rule, inheritMode);
                if (inheritMode && !props.length)
                    continue;

                var isPseudoElementSheet = (pseudoElements[p] != "");
                var sourceLink = this.getSourceLink(null, rule);

                if (!isPseudoElementSheet)
                    this.markOverriddenProps(element, props, usedProps, inheritMode);

                rules.unshift({
                    rule: rule,
                    selector: rule.selectorText.replace(/ :/g, " *:"), // (issue 3683)
                    sourceLink: sourceLink,
                    props: props, inherited: inheritMode,
                    isSystemSheet: isSystemSheet,
                    isPseudoElementSheet: isPseudoElementSheet,
                    isSelectorEditable: true
                });
            }
        }

        if (element.style)
            this.getStyleProperties(element, rules, usedProps, inheritMode);

        if (FBTrace.DBG_CSS)
            FBTrace.sysout("getElementRules " + rules.length + " rules for " +
                Xpath.getElementXPath(element), rules);
    },

    markOverriddenProps: function(element, props, usedProps, inheritMode)
    {
        // Element can contain an invalid name (see issue 5303)
        try
        {
            var dummyElement = element.ownerDocument.createElementNS(
                element.namespaceURI, element.tagName);
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("css.markOverriddenProps:", err);
            return;
        }

        for (var i=0; i<props.length; i++)
        {
            var prop = props[i];

            // Helper array for all shorthand properties for the current property.
            prop.computed = {};

            // Get all shorthand properties.
            var dummyStyle = dummyElement.style;

            // xxxHonza: Not sure why this happens.
            if (!dummyStyle)
            {
                if (FBTrace.DBG_ERRORS)
                {
                    FBTrace.sysout("css.markOverridenProps; ERROR dummyStyle is NULL for clone " +
                        "of " + element, dummyElement);
                }
                return;
            }

            dummyStyle.cssText = "";
            dummyStyle.setProperty(prop.name, prop.value, prop.important);

            var length = dummyStyle.length;
            for (var k=0; k<length; k++)
            {
                var name = dummyStyle.item(k);

                prop.computed[name] = {
                    overridden: false
                };

                if (usedProps.hasOwnProperty(name))
                {
                    var deadProps = usedProps[name];

                    // all previous occurrences of this property
                    for (var j=0; j<deadProps.length; j++)
                    {
                        var deadProp = deadProps[j];

                        // xxxHonza: fix for issue 3009, cross out even inherited properties
                        //if (deadProp.wasInherited)
                        //    continue;

                        if (!deadProp.disabled && deadProp.important && !prop.important)
                        {
                            // new occurrence overridden
                            prop.overridden = true;

                            // Remember what exact shorthand property has been overridden.
                            // This should help when we want to cross out only specific
                            // part of the property value.
                            if (prop.computed.hasOwnProperty(name))
                                prop.computed[name].overridden = true;
                        }
                        else if (!prop.disabled)
                        {
                            // previous occurrences overridden
                            deadProp.overridden = true;

                            if (deadProp.computed.hasOwnProperty(name))
                                deadProp.computed[name].overridden = true;
                        }
                    }
                }
                else
                {
                    usedProps[name] = [];
                }

                // all occurrences of a property seen so far, by name
                usedProps[name].push(prop);
            }

            prop.wasInherited = inheritMode ? true : false;
        }
    },

    removeOverriddenProps: function(rules, sections)
    {
        function removeProps(rules)
        {
            var i=0;
            while (i<rules.length)
            {
                var props = rules[i].props;

                var j=0;
                while (j<props.length)
                {
                    if (props[j].overridden)
                        props.splice(j, 1);
                    else
                        ++j;
                }

                if (props.length == 0)
                    rules.splice(i, 1);
                else
                    ++i;
            }
        }

        removeProps(rules);

        var i=0;
        while (i < sections.length)
        {
            var section = sections[i];
            removeProps(section.rules);

            if (section.rules.length == 0)
                sections.splice(i, 1);
            else
                ++i;
        }
    },

    removeSystemRules: function(rules, sections)
    {
        function removeSystem(rules)
        {
            var i=0;
            while (i<rules.length)
            {
                if (rules[i].isSystemSheet)
                    rules.splice(i, 1);
                else
                    ++i;
            }
        }

        removeSystem(rules);

        var i=0;
        while (i<sections.length)
        {
            var section = sections[i];
            removeSystem(section.rules);

            if (section.rules.length == 0)
                sections.splice(i, 1);
            else
                ++i;
        }
    },

    getStyleProperties: function(element, rules, usedProps, inheritMode)
    {
        var props = this.parseCSSProps(element.style, inheritMode);
        this.addDisabledProperties(this.context, element, inheritMode, props);

        this.sortProperties(props);

        this.markOverriddenProps(element, props, usedProps, inheritMode);

        if (props.length)
        {
            rules.unshift({rule: element, selector: "element.style",
                props: props, inherited: inheritMode});
        }
    },

    inspectDeclaration: function(rule)
    {
        Firebug.chrome.select(rule, "stylesheet");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // extends Panel

    show: function(state)
    {
        if (this.selection)
            this.refresh();
    },

    watchWindow: function(context, win)
    {
        if (Dom.domUtils)
        {
            // Normally these would not be required, but in order to update after the state is set
            // using the options menu we need to monitor these global events as well
            context.addEventListener(win, "mouseover", this.onHoverChange, false);
            context.addEventListener(win, "mousedown", this.onActiveChange, false);
        }
    },

    unwatchWindow: function(context, win)
    {
        context.removeEventListener(win, "mouseover", this.onHoverChange, false);
        context.removeEventListener(win, "mousedown", this.onActiveChange, false);

        var doc = win.document;
        if (Dom.isAncestor(this.stateChangeEl, doc))
            this.removeStateChangeHandlers();
    },

    supportsObject: function(object, type)
    {
        return object instanceof window.Element ? 1 : 0;
    },

    updateView: function(element)
    {
        // We can properly update the view only if the page is fully loaded (see issue 5654).
        var loadHandler = new LoadHandler();
        loadHandler.handle(this.context, Obj.bindFixed(this.doUpdateView, this, element));
    },

    doUpdateView: function(element)
    {
        // All stylesheets should be ready now, update the view.
        this.updateCascadeView(element);

        if (Dom.domUtils)
        {
            this.contentState = safeGetContentState(element);
            this.addStateChangeHandlers(element);
        }
    },

    updateSelection: function(element)
    {
        if (!(element instanceof window.Element)) // html supports SourceLink
            return;

        var sothinkInstalled = !!Firefox.getElementById("swfcatcherKey_sidebar");
        if (sothinkInstalled)
        {
            var div = FirebugReps.Warning.tag.replace({object: "SothinkWarning"}, this.panelNode);
            div.textContent = Locale.$STR("SothinkWarning");
            return;
        }

        this.updateView(element);
    },

    updateOption: function(name, value)
    {
        var options = new Set();
        options.add("onlyShowAppliedStyles");
        options.add("showUserAgentCSS");
        options.add("expandShorthandProps");
        options.add("colorDisplay");
        options.add("showMozillaSpecificStyles");

        if (options.has(name))
            this.refresh();
    },

    getOptionsMenuItems: function()
    {
        var items = [
            Menu.optionMenu("Only_Show_Applied_Styles", "onlyShowAppliedStyles",
                "style.option.tip.Only_Show_Applied_Styles"),
            Menu.optionMenu("Show_User_Agent_CSS", "showUserAgentCSS",
                "style.option.tip.Show_User_Agent_CSS"),
            Menu.optionMenu("Expand_Shorthand_Properties", "expandShorthandProps",
                "css.option.tip.Expand_Shorthand_Properties")
        ];

        items = Arr.extendArray(items, CSSModule.getColorDisplayOptionMenuItems());

        if (Dom.domUtils && this.selection)
        {
            var self = this;

            items.push(
                "-",
                {
                    label: "style.option.label.hover",
                    id: "toggleHoverState",
                    type: "checkbox",
                    checked: self.hasPseudoClassLock(":hover"),
                    tooltiptext: "style.option.tip.hover",
                    command: function()
                    {
                        self.togglePseudoClassLock(":hover");
                    }
                },
                {
                    label: "style.option.label.active",
                    id: "toggleActiveState",
                    type: "checkbox",
                    checked: self.hasPseudoClassLock(":active"),
                    tooltiptext: "style.option.tip.active",
                    command: function()
                    {
                        self.togglePseudoClassLock(":active");
                    }
                },
                {
                    label: "style.option.label.focus",
                    id: "toggleFocusState",
                    type: "checkbox",
                    checked: self.hasPseudoClassLock(":focus"),
                    tooltiptext: "style.option.tip.focus",
                    command: function()
                    {
                        self.togglePseudoClassLock(":focus");
                    }
                }
            );
        }

        return items;
    },

    getContextMenuItems: function(style, target, context, x, y)
    {
        var items = CSSStyleSheetPanel.prototype.getContextMenuItems.apply(this,
            [style, target, context, x, y]);
        var insertIndex = 0;

        for (var i = 0; i < items.length; ++i)
        {
            if (items[i].id == "fbNewCSSRule")
            {
                items.splice(i, 1);
                insertIndex = i;
                break;
            }
        }

        items.splice(insertIndex, 0, {
            label: "EditStyle",
            tooltiptext: "style.tip.Edit_Style",
            command: Obj.bindFixed(this.editElementStyle, this)
        },
        {
            label: "AddRule",
            tooltiptext: "css.tip.AddRule",
            command: Obj.bindFixed(this.addRelatedRule, this)
        });

        if (style && style.font && style.font.rule)
        {
            items.push(
                "-",
                {
                    label: "css.label.Inspect_Declaration",
                    tooltiptext: "css.tip.Inspect_Declaration",
                    id: "fbInspectDeclaration",
                    command: Obj.bindFixed(this.inspectDeclaration, this, style.font.rule)
                }
            );
        }

        return items;
    },

    showInfoTip: function(infoTip, target, x, y, rangeParent, rangeOffset)
    {
        var prop = Dom.getAncestorByClass(target, "cssProp");
        if (prop)
            var propNameNode = prop.getElementsByClassName("cssPropName").item(0);

        if (propNameNode && (propNameNode.textContent.toLowerCase() == "font" ||
            propNameNode.textContent.toLowerCase() == "font-family"))
        {
            var prevSibling = target.previousElementSibling;
            while (prevSibling)
            {
                rangeOffset += prevSibling.textContent.length;
                prevSibling = prevSibling.previousElementSibling;
            }
        }

        return CSSStyleSheetPanel.prototype.showInfoTip.call(
            this, infoTip, target, x, y, rangeParent, rangeOffset);
    },

    getCurrentColor: function()
    {
        var cs = this.selection.ownerDocument.defaultView.getComputedStyle(this.selection);
        return cs.getPropertyValue("color");
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Extends stylesheet (CSS Panel)

    deleteRuleDeclaration: function(cssSelector)
    {
        var repObject = Firebug.getRepObject(cssSelector);

        if (repObject instanceof window.Element)
            CSSModule.deleteRule(repObject);
        else
            CSSStyleSheetPanel.prototype.deleteRuleDeclaration(cssSelector);

        this.refresh();
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //

    hasPseudoClassLock: function(pseudoClass)
    {
        try
        {
            return Dom.domUtils.hasPseudoClassLock(this.selection, pseudoClass);
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("css.hasPseudoClassLock FAILS " + exc, exc);
            return false;
        }
    },

    togglePseudoClassLock: function(pseudoClass)
    {
        if (FBTrace.DBG_CSS)
            FBTrace.sysout("css.togglePseudoClassLock; pseudo-class: " + pseudoClass);

        if (Dom.domUtils.hasPseudoClassLock(this.selection, pseudoClass))
            Dom.domUtils.removePseudoClassLock(this.selection, pseudoClass);
        else
            Dom.domUtils.addPseudoClassLock(this.selection, pseudoClass);

        this.refresh();
    },

    clearPseudoClassLocks: function()
    {
        Dom.domUtils.clearPseudoClassLocks(this.selection);
    },

    addStateChangeHandlers: function(el)
    {
        this.removeStateChangeHandlers();

        Events.addEventListener(el, "focus", this.onStateChange, true);
        Events.addEventListener(el, "blur", this.onStateChange, true);
        Events.addEventListener(el, "mouseup", this.onStateChange, false);
        Events.addEventListener(el, "mousedown", this.onStateChange, false);
        Events.addEventListener(el, "mouseover", this.onStateChange, false);
        Events.addEventListener(el, "mouseout", this.onStateChange, false);

        this.stateChangeEl = el;
    },

    removeStateChangeHandlers: function()
    {
        var sel = this.stateChangeEl;
        if (sel)
        {
            Events.removeEventListener(sel, "focus", this.onStateChange, true);
            Events.removeEventListener(sel, "blur", this.onStateChange, true);
            Events.removeEventListener(sel, "mouseup", this.onStateChange, false);
            Events.removeEventListener(sel, "mousedown", this.onStateChange, false);
            Events.removeEventListener(sel, "mouseover", this.onStateChange, false);
            Events.removeEventListener(sel, "mouseout", this.onStateChange, false);
        }

        this.stateChangeEl = null;
    },

    contentStateCheck: function(state)
    {
        if (!state || this.contentState & state)
        {
            var timeoutRunner = Obj.bindFixed(function()
            {
                var newState = safeGetContentState(this.selection);
                if (newState != this.contentState)
                {
                    this.context.invalidatePanels(this.name);
                }
            }, this);

            // Delay exec until after the event has processed and the state has been updated
            setTimeout(timeoutRunner, 0);
      }
    }
});

// ********************************************************************************************* //
// Helpers

function safeGetContentState(selection)
{
    try
    {
        if (selection && selection.ownerDocument)
            return Dom.domUtils.getContentState(selection);
    }
    catch (e)
    {
        if (FBTrace.DBG_ERRORS && FBTrace.DBG_CSS)
            FBTrace.sysout("css.safeGetContentState; EXCEPTION "+e, e);
    }
}

function getFontPropValueParts(element, value, propName)
{
    const genericFontFamilies =
    {
        "serif": 1,
        "sans-serif": 1,
        "cursive": 1,
        "fantasy": 1,
        "monospace": 1,
    };

    var parts = [], origValue = value;

    // (Mirroring CSSModule.parseCSSFontFamilyValue)
    if (propName === "font")
    {
        var rePreFont = new RegExp(
            "^.*" + // anything, then
            "(" +
                "\\d+(\\.\\d+)?([a-z]*|%)|" + // a number (with possible unit)
                "(x{1,2}-)?(small|large)|medium|larger|smaller" + // or an named size description
            ") "
        );
        var matches = rePreFont.exec(value);
        if (!matches)
        {
            // Non-simple font value, like "inherit", "status-bar" or
            // "calc(12px) Arial" - just return the whole text.
            return [{type: "otherProps", value: value, lastFont: true}];
        }
        var preProps = matches[0].slice(0, -1);
        parts.push({type: "otherProps", value: preProps});
        value = value.substr(matches[0].length);
    }

    var matches = /^(.*?)( !important)?$/.exec(value);
    var fonts = matches[1].split(",");

    // What we want to know is what the specified "font-family" property means
    // for the selected element's text, not what the element actually uses (that
    // depends on font styles of its descendants). Thus, we just check the direct
    // child text nodes of the element.
    // Do not create a temporary element for testing to avoid problems like in
    // issue 5905 and 6048
    var usedFonts = [];
    var child = element.firstChild;
    do
    {
        if (!child)
            break;

        if (child.nodeType == Node.TEXT_NODE)
            usedFonts = Arr.extendArray(usedFonts, Fonts.getFonts(child));
    }
    while (child = child.nextSibling);

    var genericFontUsed = false;
    for (var i = 0; i < fonts.length; ++i)
    {
        var font = fonts[i].replace(/^["'](.*)["']$/, "$1").toLowerCase();
        var isGeneric = genericFontFamilies.hasOwnProperty(font);
        var isUsedFont = false;

        for (var j = 0; j < usedFonts.length; ++j)
        {
            var usedFont = usedFonts[j].CSSFamilyName.toLowerCase();
            if (font == usedFont || (isGeneric && !genericFontUsed))
            {
                parts.push({type: "used", value: fonts[i], font: usedFonts[j]});
                usedFonts.splice(j, 1);

                isUsedFont = true;
                if (isGeneric)
                    genericFontUsed = true;
                break;
            }
        }

        if (!isUsedFont)
            parts.push({type: "unused", value: fonts[i]});
    }

    // xxxsz: Domplate doesn't allow to check for the last element in an array yet,
    // so use this as hack
    parts[parts.length-1].lastFont = true;

    if (matches[2])
        parts.push({type: "important", value: " !important"});

    return parts;
}

// ********************************************************************************************* //
// Registration

Firebug.registerPanel(CSSStylePanel);
NLConstant.stylePanel=CSSStylePanel;
return CSSStylePanel;
// ********************************************************************************************* //
});
