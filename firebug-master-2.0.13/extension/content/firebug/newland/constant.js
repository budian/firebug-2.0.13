
var checkNodeArray = ["red1", "green", "blue", "white"];
/*if (window.NLConstant)
{
    // Stow the pre-load properties, add them back at the end
    var PreNLConstant = {};
    var preNLConstantKeys = Object.keys(NLConstant);
    preNLConstantKeys.forEach(function copyProps(key)
    {
        PreNLConstant[key] = Firebug[key];
    });
}*/
var stylePanel;
var tbody;
var currrentObjectPath;
window.NLConstant={
		checkNodeArray : checkNodeArray,
		stylePanel:stylePanel,
		tbody:tbody,
		currrentObjectPath:currrentObjectPath
	};