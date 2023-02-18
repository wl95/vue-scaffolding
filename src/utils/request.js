/* global window */
/* global document */
import axios from 'axios'
import Lodash from 'lodash'
import { message as Message } from 'antd'
import {
  WARNING_PATH, LOGIN_PATH
} from './constant.js'
import {
  config, getBreadString, getMenuPermission, getUserInfo, getLanguage,
  getLanguageText, clearAllStore
} from './index.js'
import localStorageUtil from './local-storage.js'
import loginConfig from './login-config'

// 组件文档端口号
const COMPONENTS_DOC_PORT = ''
// 组件文档跳转路径
const COMPONENTS_DOC_URL = ''
const { PAGE_SIZE } = config
const START_PAGE = 1
// 在header增加ts_token
const ADD_TS_TOKENS = [
  '/tsLogin',
  '/login',
  '/cloudLogin',
  '/authLogin',
  '/oaLogin',
  '/casLogin'
]
// 是否设置ts-token
function isSetTsTokenInStoren (url) {
  return ADD_TS_TOKENS.some((regStr) => {
    return new RegExp(`${regStr}$`).exec(url)
  })
}
// 在headers设置ts-token
function setTsTokenInHeader (headers, url) {
  // 不是这些路径才在headers设置ts-token
  if (!isSetTsTokenInStoren(url)) {
    let _tsToken = localStorageUtil.get('tsToken') || ''
    headers['ts-token'] = _tsToken
  }
}
// 检查分页数据是否正确
function checkPageResponse (data) {
  let props = ['condition', 'page', 'content']
  let keys = Object.keys(data)
  let flag = props.every((key) => {
    return keys.includes(key)
  })
  return flag
}
function getCookie (name) {
  let reg = new RegExp(`(^| )${name}=([^;]*)(;|$)`)
  let arr = document.cookie.match(reg)
  if (arr) {
    return unescape(arr[2])
  }
  return null
}
function getLoginSource () {
  return getCookie('loginSource')
}
// 是否时单点登录
function isSSO () {
  return getLoginSource() === 'SSO'
}
function goSsoSessionExpirePage () {
  let loginPath = LOGIN_PATH
  if (isSSO() && window.PROJECT) {
    loginPath = loginConfig[window.PROJECT].ssoSessionExpire
  }
  console.log('sessionExpire', loginPath)
  window.location.href = loginPath
}

function toTrim (obj) {
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return Lodash.trim(obj)
    }
    return obj
  }
  if (obj instanceof Array) {
    let copy = []
    for (let i = 0; i < obj.length; i++) {
      copy.push(toTrim(obj[i]))
    }
    return copy
  }
  if (obj instanceof Object) {
    let copy = {}
    for (let key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = toTrim(obj[key])
      }
    }
    return copy
  }
  // 原值返回不能转成类型
  return obj
}
/**
 * 处理有金额的查询条件，在等于和区间，过程中没有去除冗余字段
 */
export const handlePageCondition = (condition) => {
  let _amountType = ''
  let _amountCode = ''
  let conditionNow = condition
  if (Array.isArray(condition)) {
    return condition
  }
  Object.keys(conditionNow).forEach((o) => {
    if (o.indexOf('_amountType') !== -1) {
      _amountType = conditionNow[o]
      _amountCode = o.split('#')[1] || ''
      if (_amountType === 'equal') {
        delete conditionNow[`${_amountCode}_s`]
        delete conditionNow[`${_amountCode}_e`]
      } else if (_amountType === 'between') {
        delete conditionNow[_amountCode]
      }
      delete conditionNow[o]
    }
  })
  return conditionNow
}

const RANGE_WIDGET = ['dateRange', 'inputRange', 'dateAndRange']
const SELECT_WIDGET = ['select', 'selectDict', 'selectApi', 'selectData']


// 如果more与result有相同的字段，取result中的
const concatMore = (more, result) => {
  const temp = []
  more.forEach((item) => {
    if (!Lodash.find(result, { name: item.name })) {
      temp.push(item)
    }
  })
  return result.concat(temp)
}

const handlePagePlusCondition = (condition, searchSchema, more) => {
  let result = []
  Object.keys(condition).forEach((key) => {
    let value = condition[key]
    // isEmpty 纯数字会当作空值
    if (!Lodash.isEmpty(value) || typeof value === 'number') {
      let schema = searchSchema && searchSchema[key] || {}
      const { widget, props } = schema
      // multiple
      let logic = schema.logic || 'eq'
      if (RANGE_WIDGET.includes(widget) && Array.isArray(value)) {
        if (value.length === 1) {
          value = value[0] || ''
        } else if (value.length === 2) {
          logic = 'bt'
        }
      } else if (SELECT_WIDGET.includes(widget) && props && props.mode === 'multiple') {
        logic = 'in'
      } else if (logic === 'in' && !Array.isArray(value)) {
        value = [value]
      }
      result.push({
        name: key,
        logic,
        value
      })
    }
  })
  // 支持自定义more
  return Array.isArray(more) ? concatMore(more, result) : result
}

const fetch = (options) => {
  let {
    method = 'get',
    data = {},
    url,
    totalUrl, // 全路径url
    page = false, // 是否为分页查询
    pagePlus = false, // 是否为高级分页查询
    searchSchema, // pagePlus = true 需要，查询条件schema
    responseType = false, // 响应参数例如blob
    requestType = false, // 请求参数例如form
    isPermission = true, // 是否加数据权限 （默认加）
    timeout = 600000,
    trim = true, // 是否去空格
    xss = true // 是否加XSS过滤
  } = options
  // 统一添加前缀
  url = totalUrl || `${window.BACK_PREFIX}${url}`
  let {
    page: _page = START_PAGE,
    pageSize = PAGE_SIZE,
    condition,
    sort = {
      direction: 'DESC',
      property: ''
    },
    $extra,
    more,
    ...other
  } = data
  if (pagePlus) {
    data = {
      page: {
        number: Number(_page) - 1,
        size: pageSize
      },
      sort,
      condition: {}, // 须保留，但也有同时存在condition和more的情况
      ...$extra,
      more: handlePagePlusCondition(condition || other, searchSchema, more)
    }
  } else if (page) {
    data = {
      page: {
        number: Number(_page) - 1,
        size: pageSize
      },
      sort,
      ...$extra,
      condition: handlePageCondition(condition || other)
    }
  }
  // const headers={}
  // const headers={
  //   'X-XSRF-TOKEN':getCookie('XSRF-TOKEN')
  // }
  let headers = {
    'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
    timeout
  }
  // 克隆并取前后空格
  let cloneData = {}
  if (trim) {
    cloneData = toTrim(Lodash.cloneDeep(data))
  } else {
    cloneData = Lodash.cloneDeep(data)
  }

  // const cloneData = Lodash.cloneDeep(data)
  if (options) {
    // if (requestType === 'image') {
    //   headers = {
    //     ...headers
    //   }
    // }
    options.headers = { ...headers }
  }
  if (responseType === 'blob') {
    axios.defaults.responseType = 'blob'
  } else if (responseType === 'arraybuffer') {
    axios.defaults.responseType = 'arraybuffer'
  } else {
    axios.defaults.responseType = 'json'
  }
  let permission = getMenuPermission(url, isPermission)
  axios.defaults.withCredentials = true
  axios.defaults.headers = {
    TrackPath: window.location.pathname,
    TrackPathName: encodeURI(getBreadString()),
    dataPermission: permission ? `${permission.permissionDimension}_${permission.permissionValue}` : '',
    t_: getUserInfo().userName,
    un: getUserInfo().userName,
    lang: getLanguage()
  }
  // 设置tsToken在headers
  setTsTokenInHeader(axios.defaults.headers, url)
  if (!xss) {
    axios.defaults.headers = {
      ...axios.defaults.headers,
      dsxf: 1
    }
  }
  // http response 服务器响应拦截器，这里拦截401错误，并重新跳入登页重新获取token
  axios.interceptors.response.use(
    (response) => {
      // loadingHook({ effects: true }).setLoadingHook({ interSeveral: true, actionType: window.location.pathname }, { model: { namespace: url } }).next()
      return response
    },
    (error) => {
      return Promise.reject(error)
    }
  )
  axios.interceptors.request.use((_request) => {
    // loadingHook({ effects: true }).setLoadingHook({ interSeveral: false, actionType: window.location.pathname }, { model: { namespace: url } }).next()
    return _request
  }, error => Promise.reject(error))
  // http response 服务器响应拦截器，这里拦截401错误，并重新跳入登页重新获取token

  // const cloneData = Lodash.cloneDeep(data)
  switch (method.toLowerCase()) {
    case 'get':
      return axios.get(url, { params: cloneData }, { ...headers })
    case 'delete':
      return axios.delete(url, { data: cloneData }, { ...headers })
    case 'post':
      if (requestType === 'form') {
        // return axios.post(url, data, { withCredentials: true, headers: { 'Content-Type': 'multipart/form-data' ,'X-XSRF-TOKEN':getCookie('XSRF-TOKEN')} })
        return axios.post(url, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }
      return axios.post(url, cloneData, { ...headers })

    case 'put':
      return axios.put(url, cloneData, { ...headers })
    case 'patch':
      return axios.patch(url, cloneData, { ...headers })
    default:
      return axios(options)
  }
}
// 因为当无密码登录时，不会跳转到我们自己的/login页。所以在这个方法里统一处理登录
export const goLoginPage = () => {
  let loginPath = LOGIN_PATH
  const userInfo = localStorageUtil.getJSON('userInfo') || {}
  if (isSSO() && userInfo && userInfo.ssoRedirectUrl) {
    loginPath = userInfo.ssoRedirectUrl
  }
  console.log('logout', loginPath)
  clearAllStore()
  window.location.href = loginPath
}
// 登出统一处理
export const logoutHandler = () => {
  let messageText = getLanguageText('login.tip.loginFailRelogin', '登录失效请重新登录')

  // 上云的特殊处理
  if (config.cloudLayout === true) {
    // 因为是iframe 嵌入，要调用父类方法，同时平台。
    let messageData = {
      source: '',
      actionType: 'loginOut', // loginOut失效跳转登陆页
      messageText: messageText || '',
      messageType: 'success', // success, error, warning 根据实际情况选择支持
      data: null // 额外返回参数，根据实际情况选择支持
    }
    clearAllStore()
    window.parent.postMessage(JSON.stringify(messageData), '*')
  } else { // 调到一个错误页面
    // 文档端口是6060，跳转到不同的提示页
    let { port } = window.location
    let url = `${WARNING_PATH}?msg=${messageText}&type=sessionFail`
    if (COMPONENTS_DOC_PORT === port) {
      url = COMPONENTS_DOC_URL
    }
    window.location.href = url
  }
}

export default function request (options) {
  return fetch(options)
    .then(async (response) => {
      if (response.config.responseType === 'blob' && response.data.type === 'application/json') {
        let respText = await response.data.text()
        Message.error(JSON.parse(respText).message)
      }
      const { status } = response
      let {
        responseType = false,
        noLogin = false, // 不需要验证登录
        diyResp = false // 自处理相应数据
      } = options
      if (status === 200) {
        // 设置ts-token
        if (isSetTsTokenInStoren(options.url)) {
          localStorageUtil.set('tsToken', response.headers['ts-token'] || '')
        }
        // http 200状态
        let { data } = response
        if (responseType && responseType === 'blob') {
          return Promise.resolve(response)
        }
        if (responseType && responseType !== 'blob') {
          return Promise.resolve(data)
        }
        const { message, code } = data
        // todo 这一步应该在业务里做处理
        if (data instanceof Array) {
          data = {
            list: data
          }
        }
        let respData = {}
        // token超时
        if (!noLogin && code && code === 6) {
          Message.error(message)
          if (window.location.pathname !== LOGIN_PATH) {
            logoutHandler()
          }
          return Promise.reject(data)
        } else {
          if(diyResp){
            return Promise.resolve(data)
          }else {
            if ((code && code === 1000) || code === 1010 || code === 1020) {
              return Promise.resolve(data.data)
            } else {
              return Promise.reject(data)
            }
          }
        }
      }else if (status === 401) {
        Message.error(response.data.message)
        if (window.location.pathname !== LOGIN_PATH) {
          logoutHandler()
        }
      }
      return Promise.reject(response.data)
    })
    .catch((error) => {
      const { response } = error
      let msg
      let statusCode
      if (response && response instanceof Object) {
        const { data, statusText } = response
        statusCode = response.status
        if (isSSO() && statusCode === 302) {
          goSsoSessionExpirePage()
        } else if (statusCode === 503 || statusCode === 500) {
          msg = '系统繁忙，请稍后再试'
        } else if (data === null) {
          msg = 'System error'
        } else {
          msg = data.message || statusText
        }
      } else {
        statusCode = 600
        msg = error.message || 'Network Error'
      }

      /* eslint-disable */
      return Promise.reject({ success: false, statusCode, message: msg });
    });
}
