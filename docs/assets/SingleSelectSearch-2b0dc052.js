import{_ as c,M as u,r,o as i,c as m,a as p,b as l,t as g}from"./index-a711525e.js";const _={components:{Multiselect:u},data(){return{value:{name:"Vue.js",language:"JavaScript"},options:[{name:"Vue.js",language:"JavaScript"},{name:"Rails",language:"Ruby"},{name:"Sinatra",language:"Ruby"},{name:"Laravel",language:"PHP"},{name:"Phoenix",language:"Elixir"}]}},methods:{nameWithLang({name:n,language:e}){return`${n} — [${e}]`}}},d=l("label",{class:"typo__label"},"Select with search",-1),b={class:"language-json"};function h(n,e,v,S,a,t){const o=r("multiselect");return i(),m("div",null,[d,p(o,{modelValue:a.value,"onUpdate:modelValue":e[0]||(e[0]=s=>a.value=s),options:a.options,"custom-label":t.nameWithLang,placeholder:"Select one",label:"name","track-by":"name"},null,8,["modelValue","options","custom-label"]),l("pre",b,[l("code",null,g(a.value),1)])])}const f=c(_,[["render",h]]);export{f as default};
