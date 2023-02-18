import React, { useState, useEffect } from 'react'
import { Icon } from '@ant-design/compatible'
import { history, useModel } from '@umijs/max';
import styles from './index.less'
import { random4 } from './utils'

const SHOWSMSCODE = '1' // 启动，显示短信发送
// 立刻修改密码
const INSTANT_UPDATE_CODE = 470
// 修改密码提示
const MESSAGE_CODE = 471
// const FORCE_PASSWORD = '1'
// 展示验证码
const SHOW_VS_CODE = '1'
const MODEL_NAME = 'login'




const Login = () => {
  return (
    <div className={styles.bg}>
      1111
    </div>
  )
}

export default Login
