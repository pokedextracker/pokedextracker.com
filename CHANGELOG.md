# Changelog

We no longer cut versioned releases, so this file isn't updated anymore. To see
what's changed since 2.9.0, look through the [commit
history](https://github.com/pokedextracker/pokedextracker.com/commits/master).

### 2.9.0 (2019-1-12)

##### New Features

* **lets-go:**
  * support switch friend codes (#316) ([d2a1a856](https://github.com/robinjoseph08/pokedextracker.com/commit/d2a1a856cff23af7a652ac0d01bb347ec1f8094d))
  * launch lgpe support (#317) ([2250d55e](https://github.com/robinjoseph08/pokedextracker.com/commit/2250d55e8f14fd4bf70cb807c376cdaa6200e719))
  * add new spritesheet/css (#315) ([5d74c31a](https://github.com/robinjoseph08/pokedextracker.com/commit/5d74c31acd245dc98d80d6bd02e4d055f9936de3))
* **robots:** disallow /u/ pages from being indexed (#318) ([dbaa0c58](https://github.com/robinjoseph08/pokedextracker.com/commit/dbaa0c582886e73bf82be6ccc99f22fa711fb538))

### 2.8.0 (2019-1-1)

##### New Features

* **games:** use regional_support and national_support (#314) ([2ec19806](https://github.com/robinjoseph08/pokedextracker.com/commit/2ec198064c5724a1b34f849712cc440924fadd09))
* **locations:** use pokemon.locations to simplify logic (#312) ([c1baa574](https://github.com/robinjoseph08/pokedextracker.com/commit/c1baa5749a69b5749ace883ffa85ac384c7f61f1))

##### Bug Fixes

* **dropdown:** add scroll for over 6 dexes (#308) ([bc6410d4](https://github.com/robinjoseph08/pokedextracker.com/commit/bc6410d442d2e7024f6d0413d6c7ce8194e7c6f1))

##### Tests

* **circle:** switch from travis to circle (#303) ([93d461e0](https://github.com/robinjoseph08/pokedextracker.com/commit/93d461e0a1832e899d47535905f7229cb3f763f5))

### 2.7.0 (2018-5-12)

##### Chores

* **notif:** remove ultra sun / moon notif (#296) ([8517d647](https://github.com/robinjoseph08/pokedextracker.com/commit/8517d6479d3ab14c7cb4febcb12ee3092fc0475a))

##### New Features

* **search:** add search element (#299) ([ed97a5b8](https://github.com/robinjoseph08/pokedextracker.com/commit/ed97a5b823c54ebae79457e4abbedeed402dcdfb))
* **supporters:** add supporters!! ([81f6a5c8](https://github.com/robinjoseph08/pokedextracker.com/commit/81f6a5c81c1089c2587fc63cd3c69bbefde00bb4))
* **docker:** add dockerfile and nginx.conf (#292) ([687995f3](https://github.com/robinjoseph08/pokedextracker.com/commit/687995f3848f8b3d91c07bbf2b12c9e3bf29513c))

##### Bug Fixes

* **modal:** make modal vertically scrollable ([c3c4548f](https://github.com/robinjoseph08/pokedextracker.com/commit/c3c4548f3c559d9c5e169c5cf92a13be59b3ca7d))
* **scroll:** fix scroll button (#298) ([ab066204](https://github.com/robinjoseph08/pokedextracker.com/commit/ab066204b8a8349492bc8c5ecd3d232a554dc139))

#### 2.6.1 (2018-1-3)

##### Bug Fixes

* **box:** only show alolan box on national dexes (#291) ([52e161f7](https://github.com/robinjoseph08/pokedextracker.com/commit/52e161f7e80813d2a28fc65e2a3ac3ad17680d0c))

### 2.6.0 (2018-1-2)

##### New Features

* **usum:** ultra sun ultra moon support (#290) ([9511fcb5](https://github.com/robinjoseph08/pokedextracker.com/commit/9511fcb5170ab40b031e4df913e5545ac140609c))
* **donate:** add donation form (#279) ([312b12e5](https://github.com/robinjoseph08/pokedextracker.com/commit/312b12e5483a95c946f041bd229648a06063aa85))
* **sprites:** update spritesheet and associated scss for usum (#289) ([121c904d](https://github.com/robinjoseph08/pokedextracker.com/commit/121c904d615babcad0b9afa02bbc8136f0f8654f))

### 2.5.0 (2017-12-27)

##### Chores

* **game:** replace usage of generation/region with game/regional (#288) ([857d3ae6](https://github.com/robinjoseph08/pokedextracker.com/commit/857d3ae69cef6aed58c0b027d5d8836e435c8096))
* **styles:** remove border radius from buttons ([f2f5bf0b](https://github.com/robinjoseph08/pokedextracker.com/commit/f2f5bf0b3ad1100549ae0b24b49683704f1f7115))
* **deps:** upgrade a few react modules (#281) ([cdb5b7cc](https://github.com/robinjoseph08/pokedextracker.com/commit/cdb5b7ccd96c4e99aa9dd25cf7144479af7c944a))

##### Bug Fixes

* **locations:** add empty state to locations ([202b608d](https://github.com/robinjoseph08/pokedextracker.com/commit/202b608dbb0b4b6486cf5ed7be170ee50e2a40a6))

#### 2.4.1 (2017-8-13)

##### Bug Fixes

* **footer:** add mobile styles ([5cf99606](https://github.com/robinjoseph08/pokedextracker.com/commit/5cf99606ee2311f3aca9948fb8d3c8fa52d8084e))

### 2.4.0 (2017-8-13)

##### Chores

* **deps:** Removed unused direct dependency on json-loader ([3ea51660](https://github.com/robinjoseph08/pokedextracker.com/commit/3ea5166096174ef0ee5e0cd3bbce8c8809774fe6))

##### New Features

* **footer:** add footer ([2d1c51aa](https://github.com/robinjoseph08/pokedextracker.com/commit/2d1c51aa1943f730f38bc12e4e6643db465a6146))
* **info:** show gen 6 for gen 7 national ([1045d36c](https://github.com/robinjoseph08/pokedextracker.com/commit/1045d36c5a90889a6c887ee73aa2e948a295bd0c))
* **notif:** remove alola support notification ([c4a462d3](https://github.com/robinjoseph08/pokedextracker.com/commit/c4a462d30391dff1c2b2aec8b15492a9d2a788e0))
* **tracker:** Add name of pokemon on hover in evolution chain ([87946a81](https://github.com/robinjoseph08/pokedextracker.com/commit/87946a81d09b80e0ffa066c2d27edcf53babe445))

##### Bug Fixes

* **styles:** various style fixes ([571aa355](https://github.com/robinjoseph08/pokedextracker.com/commit/571aa355aef78eef1513a33fc4f204c1f709d958))
* **local-storage:** make site usable without local storage ([2afda049](https://github.com/robinjoseph08/pokedextracker.com/commit/2afda0498e9886aad817570dce2880869e1f57ac))
* **edit-dex:** only show generation warning when there's loss of info ([bf48cfa4](https://github.com/robinjoseph08/pokedextracker.com/commit/bf48cfa4b10546496e040f771e47ddca85b23cfe))
* **fonts:** add semibold montserrat ([c084e8b6](https://github.com/robinjoseph08/pokedextracker.com/commit/c084e8b6d3b87327709caf31fa2c7c3cff6fcb9c))

### 2.3.0 (2017-2-26)

##### Chores

* **yarn:** switch to yarn ([cb7982ac](https://github.com/robinjoseph08/pokedextracker.com/commit/cb7982ac4243cb1da54ed74813de25d67df0809f))
* **deps:**
  * update babel packages to v6.22.0 ([2f017b2e](https://github.com/robinjoseph08/pokedextracker.com/commit/2f017b2e941add3957bd86524c24c1f7d7997496))
  * update babel-loader from v6.2.5 to v6.2.10 ([47cf4dad](https://github.com/robinjoseph08/pokedextracker.com/commit/47cf4dad1d6949f14cd9d69e89c2333ce8d48cff))
  * update eslint-plugin-react from v6.8.0 to v6.9.0 ([8c8aef32](https://github.com/robinjoseph08/pokedextracker.com/commit/8c8aef3248c82dd30976f50e79b9971c62112632))
  * update eslint from v3.6.0 to v3.15.0 ([d333e696](https://github.com/robinjoseph08/pokedextracker.com/commit/d333e696b0a4b989963fb9eff331bab2e1158cdc))
  * update redux-thunk from v2.1.0 to v2.2.0 ([c1ded915](https://github.com/robinjoseph08/pokedextracker.com/commit/c1ded9157581020e7d14c4ed9ecbdda8d56836b6))
  * update react-router-redux from v4.0.6 to v4.0.8 ([9bd6f6c8](https://github.com/robinjoseph08/pokedextracker.com/commit/9bd6f6c88c3c451bb869fbc2345569c559bd2f6c))
  * update react-modal from v1.5.2 to v1.6.5 ([0715640f](https://github.com/robinjoseph08/pokedextracker.com/commit/0715640fc664b04da290a03fa5d742cf6b10d67c))
  * update react and react-dom from v15.3.1 to v15.4.2 ([f59e826a](https://github.com/robinjoseph08/pokedextracker.com/commit/f59e826aaee1f012db26ef2a0d5f441ec8b3e9dd))
  * update raven-js from v3.7.0 to v3.10.0 ([29f0c4e1](https://github.com/robinjoseph08/pokedextracker.com/commit/29f0c4e18e8062f2085e787adb80a9ab141c62a2))
  * update qs from v6.2.1 to v6.3.0 ([4eec07c9](https://github.com/robinjoseph08/pokedextracker.com/commit/4eec07c9ceda34b2a4ba9b8c5d284d95354b00d1))
  * update css-loader from v0.25.0 to v0.26.1 ([3e79dcca](https://github.com/robinjoseph08/pokedextracker.com/commit/3e79dcca53d86571725543e42147cb3c0a64c318))
  * update babel-eslint from v6.1.2 to v7.1.1 ([f93f97ec](https://github.com/robinjoseph08/pokedextracker.com/commit/f93f97ece0bb7543d82dd9f3df4dc5574d63d3a8))
  * update node-sass and sass-loader ([6ad8b289](https://github.com/robinjoseph08/pokedextracker.com/commit/6ad8b2896d5a8d2805ea88845ace46277d6abc7c))
  * update webpack and webpack-dev-server to v2 ([486b8642](https://github.com/robinjoseph08/pokedextracker.com/commit/486b86427cf2953aa1dd7c5e421af3d644df657c))
  * update lodash from v4.16.2 to v4.17.4 ([c0e6d8ed](https://github.com/robinjoseph08/pokedextracker.com/commit/c0e6d8ed45f0d0f981e49cf150058c20694d5785))
  * update generate-changelog from v1.0.0 to v1.1.0 ([557559a2](https://github.com/robinjoseph08/pokedextracker.com/commit/557559a27e57143a4e38bdda8a2e4c735e7f04b9))
  * update react-router from v2.8.1 to v3.0.2 ([6f3efe7e](https://github.com/robinjoseph08/pokedextracker.com/commit/6f3efe7ecabf0900072309a0ec0542896ac88cab))
  * update react-redux from v4.4.5 to v5.0.2 ([2835377e](https://github.com/robinjoseph08/pokedextracker.com/commit/2835377e5d11aeb482535ebd3343cfc56fb37f48))
* **devtools:** Add hook for redux devtools ([3348944c](https://github.com/robinjoseph08/pokedextracker.com/commit/3348944c657664642cfd2e2e6625e71f8c262d94))

##### Documentation Changes

* **readme:** add badges ([e5d0e8a5](https://github.com/robinjoseph08/pokedextracker.com/commit/e5d0e8a558825872173072bddab5a46c29cb437b))

### 2.2.0 (2017-2-4)

##### New Features

* **notif:** add national gen 7 notification ([b822e34c](https://github.com/robinjoseph08/pokedextracker.com/commit/b822e34c0f2ea58ae5d6339a5ee6c6f9d7e3751e))
* **boxes:** take pokemon.box into account when grouping ([5dc15493](https://github.com/robinjoseph08/pokedextracker.com/commit/5dc15493cd9c288d08bae506a20b4da938e9cce2))
* **edit:** add region to edit dex ([4bd3f95d](https://github.com/robinjoseph08/pokedextracker.com/commit/4bd3f95df59ed43b4b5f5066c9484ec3f0ec4f0e))
* **register:** add region to registration ([905bfb96](https://github.com/robinjoseph08/pokedextracker.com/commit/905bfb9693b06a5872ffd44ccd97e6515d4e7031))
* **create:** add region to create dex ([1da14043](https://github.com/robinjoseph08/pokedextracker.com/commit/1da14043270c8fb8d0c096268df9a071bb1d5ffe))

##### Bug Fixes

* **notif:** update styles ([53971216](https://github.com/robinjoseph08/pokedextracker.com/commit/5397121606b29c7dbebeaa76da16ea248b8db208))
* **box:** normal case for box headers ([0391198d](https://github.com/robinjoseph08/pokedextracker.com/commit/0391198d6423fc68141d961d0ddd41e0de498c86))

### 2.1.0 (2017-1-29)

##### Documentation Changes

* **readme:** update travis badge ([35e3de70](https://github.com/robinjoseph08/pokedextracker.com/commit/35e3de703ffd50744b37f6c5fe9ed4db6a814f8b))

##### New Features

* **notif:** remove 2016-12-10 notif ([8bbd8d08](https://github.com/robinjoseph08/pokedextracker.com/commit/8bbd8d08a6827e9ff66df984dbd9d317ca355bc1))

##### Refactors

* **pokemon:** use pokemon.id instead of pokemon.national_id ([b0583224](https://github.com/robinjoseph08/pokedextracker.com/commit/b058322451de3e0b0ce7b663dcc3d53e8c374f72))

##### Code Style Changes

* **lint:**
  * enforce react/sort-comp lint rule ([2f9d3b4f](https://github.com/robinjoseph08/pokedextracker.com/commit/2f9d3b4f9f5410110f0b2dd0e9606f7401b657c7))
  * enforce react/self-closing-comp lint rule ([c3f23992](https://github.com/robinjoseph08/pokedextracker.com/commit/c3f23992e9fec40de011c6e17f444802db7ee02e))
  * enforce react/no-array-index-key lint rule ([15166acb](https://github.com/robinjoseph08/pokedextracker.com/commit/15166acb074dd189e0d72d150a13da220339de03))
  * enforce react/jsx-no-target-blank lint rule ([c3a15921](https://github.com/robinjoseph08/pokedextracker.com/commit/c3a15921239637b268076837c2e734169895e5aa))
  * enforce react/jsx-boolean-value lint rule ([bef5a621](https://github.com/robinjoseph08/pokedextracker.com/commit/bef5a6217e5f34bc1f8085847ecf73f461c238ae))
  * update eslint-plugin-react and enable common rules ([546012cf](https://github.com/robinjoseph08/pokedextracker.com/commit/546012cfba30b0c763eaee7707726cc499150cef))

#### 2.0.1 (2016-12-12)

##### Bug Fixes

* **nav:** fix dropdown for mobile ([3948623a](https://github.com/robinjoseph08/pokedextracker.com/commit/3948623a136b58d9b05e75a194dfe9aef136a364))

## 2.0.0 (2016-12-10)

##### Chores

* **webpack:** exclude node_modules from babel to speed things up ([2025792d](https://github.com/robinjoseph08/pokedextracker.com/commit/2025792dc70ccf92b8c39a5d25b1ab5a96784807))
* **config:** add local config ([e45c107e](https://github.com/robinjoseph08/pokedextracker.com/commit/e45c107e7fe788047d8563b723d558e9f5301ac1))

##### New Features

* **home:** update home content ([bbefb4dd](https://github.com/robinjoseph08/pokedextracker.com/commit/bbefb4dde9dd71284e9cee311c4265898a152efd))
* **notification:** add base of notification ([09a4f38c](https://github.com/robinjoseph08/pokedextracker.com/commit/09a4f38ce1706815c151b1bf805c653d0eaad43a))
* **dexes:**
  * add edit dex modal ([88ba0812](https://github.com/robinjoseph08/pokedextracker.com/commit/88ba0812f6e8d19e5e09c2e61770fdadd89b872b))
  * add shiny dex indicator ([c374f09a](https://github.com/robinjoseph08/pokedextracker.com/commit/c374f09a5c93976de27d85a7340d8ac5ffebabc0))
  * use shiny sprites for shiny dexes ([e5329cb9](https://github.com/robinjoseph08/pokedextracker.com/commit/e5329cb94d559a2b5cbdcc13aba994ab3c0a7fbe))
  * add dexes to signup ([b8174c38](https://github.com/robinjoseph08/pokedextracker.com/commit/b8174c380c5f096182e369dac85b5a5a40096e83))
* **tracker:**
  * add indicator for gens ([0f672666](https://github.com/robinjoseph08/pokedextracker.com/commit/0f6726661042e7db9c49bd8eb6a0552b7f2a728c))
  * support gen 7 and regional dexes ([66b02709](https://github.com/robinjoseph08/pokedextracker.com/commit/66b027096bd9f3103b448114db1de93ed7c3bed9))
* **pokesprite:** update for gen 7 ([2037a5a3](https://github.com/robinjoseph08/pokedextracker.com/commit/2037a5a3d582a83b7ae61b6ddd80b7345508dafb))
* **nav:** update nav for multiple dexes ([a427272a](https://github.com/robinjoseph08/pokedextracker.com/commit/a427272a0e5e3dd9882c9c326f9bcbe987d10f7a))
* **dex:** add create dex modal ([4128d4ad](https://github.com/robinjoseph08/pokedextracker.com/commit/4128d4ad54092e9209a42b35b9a976de22d390ba))
* **profile:**
  * connect profile page ([b1bdcffc](https://github.com/robinjoseph08/pokedextracker.com/commit/b1bdcffc5662171db57999588e0ef64deb81bab5))
  * add profile page ([ee4940a1](https://github.com/robinjoseph08/pokedextracker.com/commit/ee4940a11ef6381c4c0c2586d502053e76b0a425))

##### Bug Fixes

* **404:** gracefully 404 on the tracker page ([4e84fccc](https://github.com/robinjoseph08/pokedextracker.com/commit/4e84fccc26cfedcf4e65a4f3b77a2bfc14c24b87))
* **mark-all:** fix mark all button for partially marked box ([fe093982](https://github.com/robinjoseph08/pokedextracker.com/commit/fe0939828c53ec59e7d161e7948d81a3df83a1a7))
* **notification:**
  * mark notification as read if registering ([dacd1c20](https://github.com/robinjoseph08/pokedextracker.com/commit/dacd1c204f3ca796ec8c408a202dbf3d303e236d))
  * add styles ([ce30a66c](https://github.com/robinjoseph08/pokedextracker.com/commit/ce30a66c2207dddd182f124165f31f85892a859c))
* **sprites:** use real gen 7 shiny sprites ([bff0eec1](https://github.com/robinjoseph08/pokedextracker.com/commit/bff0eec1c5617ef105ccf1e6a2f9f1c49c267f18))
* **dexes:**
  * add functionality to edit/delete dex modal ([8f54697e](https://github.com/robinjoseph08/pokedextracker.com/commit/8f54697e66dcd751f93c40a2a7a2f353b335d23f))
  * form style updates ([24ef3cc0](https://github.com/robinjoseph08/pokedextracker.com/commit/24ef3cc0726a5667014dbc770f443dceb0af6f62))
* **generation:** default to gen 7 ([29045018](https://github.com/robinjoseph08/pokedextracker.com/commit/290450186621e26d84ac593d1b5a348ce4e77cc9))
* **share:** fix share styles ([2a438168](https://github.com/robinjoseph08/pokedextracker.com/commit/2a438168ade22d2f87945d083fc749b875ed8a40))
* **nav:**
  * style updates ([ca29f57b](https://github.com/robinjoseph08/pokedextracker.com/commit/ca29f57b5b27506985e3f2f22a24501f8e2526ae))
  * load user for nav into sessionUser ([38f5a9bb](https://github.com/robinjoseph08/pokedextracker.com/commit/38f5a9bbc528258a8817baa45eb859ab8518b12c))
* **dex:**
  * add url preview to dex create ([1d867242](https://github.com/robinjoseph08/pokedextracker.com/commit/1d8672425733be59089a994dc8e41df000c55cfa))
  * create dex modal fixes ([43dec59a](https://github.com/robinjoseph08/pokedextracker.com/commit/43dec59aeebb0901cce437280d6cb1c813142c06))
  * modal styles ([d62bb962](https://github.com/robinjoseph08/pokedextracker.com/commit/d62bb9623ba3740a2591ad93c269429559a36e71))
* **forms:** scroll to top on form error ([b2a5cd32](https://github.com/robinjoseph08/pokedextracker.com/commit/b2a5cd327092b02ad2466ac66cd3d48b74c62394))
* **register:** redirect to first dex page instead of profile ([46a328a2](https://github.com/robinjoseph08/pokedextracker.com/commit/46a328a26160ba35825830441aa486b03c4eea5f))

#### 1.11.3 (2016-11-26)

##### Bug Fixes

* **evolutions:** add some extra spaces ([f9ac1d79](https://github.com/robinjoseph08/pokedextracker.com/commit/f9ac1d792709a749598397ce27dbc33ee66af729))

##### Refactors

* **info:** generate urls on the front-end ([26b69510](https://github.com/robinjoseph08/pokedextracker.com/commit/26b695105bb67085256eab1dfff82f3b66a2a060))

#### 1.11.2 (2016-11-10)

##### Bug Fixes

* **progress:** add percentage ([dd36b26d](https://github.com/robinjoseph08/pokedextracker.com/commit/dd36b26d54cbfa10243247d041e75688ff686003))

##### Refactors

* **dexes:** use the dexes API for the tracker page ([af3e7cd0](https://github.com/robinjoseph08/pokedextracker.com/commit/af3e7cd0c740410d6e12f6067570feafb51b24f0))

#### 1.11.1 (2016-10-25)

##### Documentation Changes

* **license:** add license file ([59b12a43](https://github.com/robinjoseph08/pokedextracker.com/commit/59b12a43097d514c1f5a64c517a44d27848ac360))
* **changelog:** update links ([3dbc52d9](https://github.com/robinjoseph08/pokedextracker.com/commit/3dbc52d98882b206e2d747e2306b3e9e4aa70483))

##### Bug Fixes

* **load:** wait for DOMContentLoaded if necessary ([b5f49c65](https://github.com/robinjoseph08/pokedextracker.com/commit/b5f49c651464f85713bd2877d80e3f736c641ff0))
* **scroll:** check if _dex exists ([595f4ae2](https://github.com/robinjoseph08/pokedextracker.com/commit/595f4ae28a5310ac6d07956bd90d03254560dccb))
* **polyfill:** add babel-polyfill ([58ca2ea3](https://github.com/robinjoseph08/pokedextracker.com/commit/58ca2ea300ce9d1f145e18bc280b7168d43e2148))

### 1.11.0 (2016-10-23)

##### Chores

* **package:** fix typos in the package.json ([fbb86bb0](https://github.com/robinjoseph08/pokedextracker.com/commit/fbb86bb0090340f07136da66f4ab430490ba26ce))
* **cleanup:** remove unnecessary comments ([386a0e9b](https://github.com/robinjoseph08/pokedextracker.com/commit/386a0e9b3dcee98d4ec891d1744bc3d0c1609cdd))
* **files:** remove unused views and services directories ([b57fb72e](https://github.com/robinjoseph08/pokedextracker.com/commit/b57fb72e340362d38f833cc33d1a62c98d63eae1))

##### New Features

* **errors:** add sentry for error logging ([9fa732fc](https://github.com/robinjoseph08/pokedextracker.com/commit/9fa732fcc5f3921d2c504518b67788cda8f03394))

##### Refactors

* **jsx:** use self-closing tags ([8d0ba2e9](https://github.com/robinjoseph08/pokedextracker.com/commit/8d0ba2e91313f433969827dd51ac04e73b47fab7))
* **state:** move error and loading to local state ([a546a25e](https://github.com/robinjoseph08/pokedextracker.com/commit/a546a25e1eccccf162b3daab281c3549a4cd7585))

### 1.10.0 (2016-10-22)

##### Bug Fixes

* **captures:** bulk edit the state for (un)markall button ([57004690](https://github.com/robinjoseph08/pokedextracker.com/commit/57004690c7efd3634c76c9fd3797ffcb69720e10))
* **redirect:** redirect from home, login, register if logged in ([9ce016e7](https://github.com/robinjoseph08/pokedextracker.com/commit/9ce016e760adcb9b2fe5e9fecb3594b9c3b0f587))
* **region:** fix non-mobile region select ([6111c485](https://github.com/robinjoseph08/pokedextracker.com/commit/6111c485f40a09819c0b6b6564bdf39bd417673c))
* **twitter:** fix refactored twitter link ([74987406](https://github.com/robinjoseph08/pokedextracker.com/commit/74987406a868d86d8af28df1ca98e9653e3f30ea))
* **info:** remove no-touch styles for info btn ([b9cc0a7c](https://github.com/robinjoseph08/pokedextracker.com/commit/b9cc0a7c933dca6a80428246072ef69105646150))

##### Refactors

* **react:**
  * add analytics ([1836652c](https://github.com/robinjoseph08/pokedextracker.com/commit/1836652ced1337046bef179627815d5207a4ea8b))
  * add account page ([2e386c6a](https://github.com/robinjoseph08/pokedextracker.com/commit/2e386c6aba042139d51088660a22e729fd09523e))
  * add mobile region picker ([082adf3d](https://github.com/robinjoseph08/pokedextracker.com/commit/082adf3d822f1e5fcf76a7dc2b381e5a9f6ec0f1))
  * modify document title for each route ([7a9a05d8](https://github.com/robinjoseph08/pokedextracker.com/commit/7a9a05d81eb937e5cd1f189b5aec869ff8d92e51))
  * add mark all button ([d3275140](https://github.com/robinjoseph08/pokedextracker.com/commit/d327514053e832584f9dd542a89ff2b5a66a59af))
  * add functionality to reload component ([5581641b](https://github.com/robinjoseph08/pokedextracker.com/commit/5581641b5df63dbe73bc93a366aaeca4a04cf53c))
  * move over reload styles ([37f118e8](https://github.com/robinjoseph08/pokedextracker.com/commit/37f118e87b25a7b43a6f896030148e5757d4244f))
  * add individual captured toggling capabilities ([005aea0d](https://github.com/robinjoseph08/pokedextracker.com/commit/005aea0d3fe956ac823fa39ddda2a93da4164302))
  * use ref callback instead of ref string ([d7374d68](https://github.com/robinjoseph08/pokedextracker.com/commit/d7374d68b9e1ec0712c06e296b106dcbc95de971))
  * add scroll to top button ([12b93052](https://github.com/robinjoseph08/pokedextracker.com/commit/12b930522bb0d44e2f6b031d144b921cf870d567))
  * rename infoOpen and shareOpen to showInfo and showShare ([166fdec8](https://github.com/robinjoseph08/pokedextracker.com/commit/166fdec81b828f05de9ee476ba451d9653fc258c))
  * convert register page ([fe793a65](https://github.com/robinjoseph08/pokedextracker.com/commit/fe793a65fe8d3eefe815930eca730c524a4fac3e))
  * switch to react ([347c2425](https://github.com/robinjoseph08/pokedextracker.com/commit/347c24250400e6b0c07a931d6f2da14d2387d10a))

### 1.9.0 (2016-10-10)

##### New Features

* **reload:**
  * add functionality to reload component ([ec9c61e9](https://github.com/robinjoseph08/pokedextracker.com/commit/ec9c61e97c130055458f95ef7e76e9898f53be42))
  * add reload component and styles ([843e5156](https://github.com/robinjoseph08/pokedextracker.com/commit/843e5156e2fcf3da0e0d37342924d8d2a34a8268))

##### Refactors

* **buttons:**
  * better btn styles ([c55bac1f](https://github.com/robinjoseph08/pokedextracker.com/commit/c55bac1f4d1ccb76f5df0ef474f55c96828c7ba9))
  * add .btn styles ([0ccb4f20](https://github.com/robinjoseph08/pokedextracker.com/commit/0ccb4f207ccbc1400896d26af3aefa3ad6d176cd))

### 1.8.0 (2016-9-17)

##### Chores

* **deps:**
  * update node-sass from 3.4.2 to 3.9.3 ([df898980](https://github.com/robinjoseph08/pokedextracker.com/commit/df89898023080db9117eb85929cc6b9ca96951dd))
  * make fsevents optional ([581e1af4](https://github.com/robinjoseph08/pokedextracker.com/commit/581e1af43d2c9e14e92987e449d2396a1ae460db))

##### Documentation Changes

* **windows:** make a note about using nvm on windows ([a6d119c8](https://github.com/robinjoseph08/pokedextracker.com/commit/a6d119c87439e36f0e6df3b6536a71ed5dddd219))
* **shrinkwrap:** add docs for fsevents/shrinkwrap issues ([92e2bdbe](https://github.com/robinjoseph08/pokedextracker.com/commit/92e2bdbe596aa76980214f99f6b7cd1ad48ba854))

##### Bug Fixes

* **pkicon:** better class property ([560d60ec](https://github.com/robinjoseph08/pokedextracker.com/commit/560d60ecb8cb445c9f791c65d87e546cfd224f52))
* **webpack:** use path.join in config ([dd34937f](https://github.com/robinjoseph08/pokedextracker.com/commit/dd34937f2e56db41d7ca05ca66bccc9b5a5262ed))
* **home:** replace loveball w pokesprite ([37ce1387](https://github.com/robinjoseph08/pokedextracker.com/commit/37ce1387ad218c7773a6a961da509a1cd0a3c95d))
* **spinner:** hide content when spinning ([c8419d51](https://github.com/robinjoseph08/pokedextracker.com/commit/c8419d51935c72930b11fd9fce4e7c717be46ed2))

### 1.7.0 (2016-9-6)

##### New Features

* **sprites:** use modified pokesprite ([17dcabcb](https://github.com/robinjoseph08/pokedextracker.com/commit/17dcabcb3a8ae4c6132ae7e56391df568a43c45f))

### 1.6.0 (2016-9-5)

##### Chores

* **deps:**
  * remove test dependencies ([f78bb39a](https://github.com/robinjoseph08/pokedextracker.com/commit/f78bb39ab23ca854246eeb133d4917daed59d4e7))
  * upgrade angular beta.17 -> rc.4 ([792e565e](https://github.com/robinjoseph08/pokedextracker.com/commit/792e565e9c646abdbc283dd1f878b10cce56d367))
  * upgrade angular beta.12 -> beta.17 ([eb85bbcf](https://github.com/robinjoseph08/pokedextracker.com/commit/eb85bbcf10db779cc3ecaf8cff1e91e530a3b395))

##### Documentation Changes

* **contributing:** add CONTRIBUTING.md ([d29754da](https://github.com/robinjoseph08/pokedextracker.com/commit/d29754da9fb298097f5b5456401d84ec1f1fef41))

##### New Features

* **share:** link to tweet ([a9f4efc0](https://github.com/robinjoseph08/pokedextracker.com/commit/a9f4efc0200899acab3ff8f0b9e6245dcacf9666))
* **account:**
  * add functionality to the account page ([83f2808d](https://github.com/robinjoseph08/pokedextracker.com/commit/83f2808deb8c92da261ced77af225222b6312683))
  * styles for account page ([b90dcd3b](https://github.com/robinjoseph08/pokedextracker.com/commit/b90dcd3b04a62c64b612719425628fe564cd3064))
  * lay base for account page ([af6bf6ae](https://github.com/robinjoseph08/pokedextracker.com/commit/af6bf6ae6754e6451efc7cfe1d2a29d6d9d35a07))
* **twitter:** add twitter link ([a150dea1](https://github.com/robinjoseph08/pokedextracker.com/commit/a150dea1195c2b8e6946efc7d9ae39c8e5d9f263))

##### Bug Fixes

* **webpack:** remove reference to istanbul-instrumenter ([bf0c9626](https://github.com/robinjoseph08/pokedextracker.com/commit/bf0c9626a77de374a2a4469a7b776507eda5b042))
* **shrinkwrap:** remove references to nodejitsu ([652d79b7](https://github.com/robinjoseph08/pokedextracker.com/commit/652d79b7884040e81108a1fe93eb2437ece49aaa))

### 1.5.0 (2016-7-25)

##### Chores

* **lint:** update tslint from 3.6.0 to 3.13.0 ([0c89994f](https://github.com/robinjoseph08/pokedextracker.com/commit/0c89994ff43b9b4a0361c7bd510caecf6c83aaf1))

##### New Features

* **info:** add btn to serebii ([2a997ada](https://github.com/robinjoseph08/pokedextracker.com/commit/2a997ada3ea157ebfdfc89181dcf5813cf1ac8a9))
* **dex:** added serebii link ([09847798](https://github.com/robinjoseph08/pokedextracker.com/commit/09847798d9669886a724393b7b7c5b640ff8a8d5))

##### Tests

* **travis:** enable travis ci for linting ([da372952](https://github.com/robinjoseph08/pokedextracker.com/commit/da372952518cac1e2842fb63d13d1e374c13f225))

### 1.4.0 (2016-5-21)

##### New Features

* **evolutions:** add links to the pokemon ([c19c5f98](https://github.com/robinjoseph08/pokedextracker.com/commit/c19c5f983f5e2c35a77bc96769254e9ddc0b4534))

### 1.3.0 (2016-5-17)

##### New Features

* **register:** send referrer ([f7c69d01](https://github.com/robinjoseph08/pokedextracker.com/commit/f7c69d01930984be814e606ed68aa2ceab03ce21))

### 1.2.0 (2016-5-6)

##### New Features

* **scroll:** enable scroll to top ([cd2956ce](https://github.com/robinjoseph08/pokedextracker.com/commit/cd2956ce24d52d30d5e4ed3910e07a525456557b))
* **dex:** clickable scroll bar + back to top btn ([89b22933](https://github.com/robinjoseph08/pokedextracker.com/commit/89b22933c4dd1a621fa21b2f0e090216b3f0a832))

### 1.1.0 (2016-5-1)

##### New Features

* **config:** add configs for each environment ([daa96e3a](https://github.com/robinjoseph08/pokedextracker.com/commit/daa96e3a22eb87dee24142e748c7db1e49bd7fdd))

#### 1.0.4 (2016-4-21)

##### Bug Fixes

* **styles:** fix firefox bugs ([7a32937d](https://github.com/robinjoseph08/pokedextracker.com/commit/7a32937de928feb7cea34f8b85b0444885ea36d8))

#### 1.0.3 (2016-4-17)

##### Bug Fixes

* **register:** fix friend_code ([9f83c26f](https://github.com/robinjoseph08/pokedextracker.com/commit/9f83c26fe18fb1c5e6217c3ad5cd03794d10f1aa))

#### 1.0.2 (2016-4-16)

##### New Features

* **seo:** add site name ([b913fa77](https://github.com/robinjoseph08/pokedextracker.com/commit/b913fa770d5d427d2d11954f2e4e1d2c2a03adfc))

#### 1.0.1 (2016-4-16)

##### Bug Fixes

* **favicon:** fix link ([c6f23b12](https://github.com/robinjoseph08/pokedextracker.com/commit/c6f23b1262079fe8ac66a3d55d264ffc66789755))
* **tracker:** fix sizing ([75d44e31](https://github.com/robinjoseph08/pokedextracker.com/commit/75d44e31a6153e2a59753c62a334b81a1ae0985b))

## 1.0.0 (2016-4-16)

##### Chores

* **404:** hook up 404 component ([f7e5fd17](https://github.com/robinjoseph08/pokedextracker.com/commit/f7e5fd17012e17bec0bf3fe88a826d50d613e3f8))
* **description:** update the description meta tag ([3ba57237](https://github.com/robinjoseph08/pokedextracker.com/commit/3ba572378535d87c070092111a9aa4dd0b0caba9))
* **angular2:** update from beta.9 -> beta.12 ([5caf306f](https://github.com/robinjoseph08/pokedextracker.com/commit/5caf306fc560a7406b654ffa3d8b780a0088134a))
* **npm:** add shrinkwrap file ([ab16ecee](https://github.com/robinjoseph08/pokedextracker.com/commit/ab16ecee99ae0813dc7ffbe242b5ddb70ab0128c))
* **init:** initial commit ([5145239a](https://github.com/robinjoseph08/pokedextracker.com/commit/5145239a5901800fd1e864de67727ca8221a8258))

##### New Features

* **404:** base for not found page ([9704479b](https://github.com/robinjoseph08/pokedextracker.com/commit/9704479b4e5931ec4d0b0d870dce8b4bc8281e62))
* **no-touch:**
  * move hover styles to no-touch ([ee4be101](https://github.com/robinjoseph08/pokedextracker.com/commit/ee4be1017cb73d6334c8c96ff0e573206a949bec))
  * add no-touch class if not on mobile ([e043ffd7](https://github.com/robinjoseph08/pokedextracker.com/commit/e043ffd7115ada83bc537702e18e8f21861cbf96))
* **analytics:**
  * track all the things! ([fe6ea47c](https://github.com/robinjoseph08/pokedextracker.com/commit/fe6ea47c40b988a2095f182a01340ca805321270))
  * add google analytics ([c39321bb](https://github.com/robinjoseph08/pokedextracker.com/commit/c39321bb214d490d5e5af1187f4b62fc6068b17f))
* **tracker:**
  * close things when clicking outside ([c945f484](https://github.com/robinjoseph08/pokedextracker.com/commit/c945f484463285e0f639efcc00f0577d03f1aa23))
  * add details to viewing mode ([c0002c83](https://github.com/robinjoseph08/pokedextracker.com/commit/c0002c837ecb713779577057bf22909083d36553))
  * responsiveness! ([f9d542ea](https://github.com/robinjoseph08/pokedextracker.com/commit/f9d542eab06134ac8141f76560a5e58f19e1f96d))
* **box:**
  * hook up Mark All button ([61de0874](https://github.com/robinjoseph08/pokedextracker.com/commit/61de08745be97c74c219ca322b4410ad47de6967))
  * base for mark whole box ([d6234c4e](https://github.com/robinjoseph08/pokedextracker.com/commit/d6234c4e83a8d6a1f7e43a41de39c1f5bc40e4cc))
* **share:** auto select share link on click ([c481fc8f](https://github.com/robinjoseph08/pokedextracker.com/commit/c481fc8fb8307571effa67971a45e020284e8a6e))
* **header:**
  * add share link ([fa7fb907](https://github.com/robinjoseph08/pokedextracker.com/commit/fa7fb907c1da830d913c7d350011b9c7fb08a389))
  * add percentage captured ([10820018](https://github.com/robinjoseph08/pokedextracker.com/commit/108200183690a8fa811e21e7c2c43b288e8128a7))
* **sitemap:** add sitemap ([b6475192](https://github.com/robinjoseph08/pokedextracker.com/commit/b647519251a76afbd9a04973082936593f2c66be))
* **evolutions:**
  * hook up evolutions ([85c0f971](https://github.com/robinjoseph08/pokedextracker.com/commit/85c0f971c4383e120704f8107bd7baff8f03ff64))
  * base for evolutions ([05bad11c](https://github.com/robinjoseph08/pokedextracker.com/commit/05bad11c917855b436253eeafab5ccc9fd9f0d75))
* **og:** add og image ([31481975](https://github.com/robinjoseph08/pokedextracker.com/commit/314819755206c6f331ce9fe93ef64ab4fcca03c1))
* **progress:** add base for percentage on progress bar ([53d09f6f](https://github.com/robinjoseph08/pokedextracker.com/commit/53d09f6f9d6c19cf0744e4ed7c0cb47a8a4e72b7))
* **nav:** pass user to nav ([bfafe0c0](https://github.com/robinjoseph08/pokedextracker.com/commit/bfafe0c03dc07c7e91a215565ec0a99a782ffe99))
* **dex:**
  * show alpha warning ([eddec47c](https://github.com/robinjoseph08/pokedextracker.com/commit/eddec47c5935bedafd7583488e9e1a115307b6eb))
  * add region toggling capabilities ([06b651ec](https://github.com/robinjoseph08/pokedextracker.com/commit/06b651ec82f10f8077192b18d24b1e0f2d006a53))
  * boxes base!!! ([ea668cd5](https://github.com/robinjoseph08/pokedextracker.com/commit/ea668cd51d6d7978fb74c2a6d95b90879039d02f))
  * dex header ([55e01865](https://github.com/robinjoseph08/pokedextracker.com/commit/55e018651fb1465baaaf96045129196e1ec98fe0))
* **info:**
  * start collapsed if width <= 750 ([fcdcd9ac](https://github.com/robinjoseph08/pokedextracker.com/commit/fcdcd9ac69e4b7b043539b95f109a91338e15a51))
  * open collapsed info if info button is clicked ([3d83b380](https://github.com/robinjoseph08/pokedextracker.com/commit/3d83b380b187f0426a29da496bd93e461dfdb605))
  * collapsible info panel ([023d15f1](https://github.com/robinjoseph08/pokedextracker.com/commit/023d15f100e240e892f64c3a0e912416cf7a6063))
  * update info on hover ([51a64028](https://github.com/robinjoseph08/pokedextracker.com/commit/51a64028c6e63e27eb78d19be64536a4ca8938ad))
  * base for info panel ([f11e1725](https://github.com/robinjoseph08/pokedextracker.com/commit/f11e17251edcff789161fd9402f6c6c6e8f3d899))
* **favicon:** add favicon ([12670798](https://github.com/robinjoseph08/pokedextracker.com/commit/126707981f60d264b1cbd4124fea8972ba7bbc23))
* **deploy:** add prod configs to deploy ([9d9bee34](https://github.com/robinjoseph08/pokedextracker.com/commit/9d9bee341c37bfc62fa5919de3a33e47b94517a1))
* **captures:** load, create, and delete captures ([5ae3cacf](https://github.com/robinjoseph08/pokedextracker.com/commit/5ae3cacf8c8b85eb527e6895e7fa8ba926d8ff0e))
* **home:**
  * home base ([8ccd78df](https://github.com/robinjoseph08/pokedextracker.com/commit/8ccd78df8a80c946284b4cd53764787376a5b936))
  * lay base for the home page ([7d0fada6](https://github.com/robinjoseph08/pokedextracker.com/commit/7d0fada6a3b5de91d98ef5e75e67385660b49364))
* **login:**
  * hook up login ([264a8e36](https://github.com/robinjoseph08/pokedextracker.com/commit/264a8e36d11d155c11698dbcb64d93e37d87b25e))
  * login base ([ac69e300](https://github.com/robinjoseph08/pokedextracker.com/commit/ac69e30086b8b2cade869f134104bac9bf769c4f))
* **routes:** finalize routing ([47119f55](https://github.com/robinjoseph08/pokedextracker.com/commit/47119f553fcb5fa4b47b11ee73778692e35fc400))
* **register:**
  * show signs of logged in ([4b31aac5](https://github.com/robinjoseph08/pokedextracker.com/commit/4b31aac517f90bbde792798125211ce829970c6e))
  * hook up the register page ([d5b79319](https://github.com/robinjoseph08/pokedextracker.com/commit/d5b793190a59d643e5549a6d418ef797bdc10830))
  * base for register ([55c545d6](https://github.com/robinjoseph08/pokedextracker.com/commit/55c545d6e7aff13a23116451ec66ad8a24b6406c))
* **pokemon:** fetch pokemon from the API ([db57c8cd](https://github.com/robinjoseph08/pokedextracker.com/commit/db57c8cd217b0bfe7b4273b80daeabc5be738b1e))
* **app:** base structure ([f779c092](https://github.com/robinjoseph08/pokedextracker.com/commit/f779c0927d8c6e36ba83b857da52ce25521fbcd2))

##### Bug Fixes

* **responsiveness:** iphone 5 width ([07b15636](https://github.com/robinjoseph08/pokedextracker.com/commit/07b1563618ea72dd621cccf6eb11370b1f062ef8))
* **title:** clean up titles ([25ffad48](https://github.com/robinjoseph08/pokedextracker.com/commit/25ffad48ecbd3864c35d3c47071920c7e3cea24f))
* **home:** update homepage ([c934eae4](https://github.com/robinjoseph08/pokedextracker.com/commit/c934eae422b40a09c7ec33425493e9268db91b7a))
* **box:** styles ([3cd617bc](https://github.com/robinjoseph08/pokedextracker.com/commit/3cd617bc3605b786844245efa2271ef11503a01e))
* **info:**
  * correctly toggle loading for info component ([1b42592c](https://github.com/robinjoseph08/pokedextracker.com/commit/1b42592c7cf9bee9d5061e4f8f6d66897d3d99f0))
  * load pokemon info if it hasn't been loaded already ([1ae54cb2](https://github.com/robinjoseph08/pokedextracker.com/commit/1ae54cb2213da3181b1a2e85990f66d361699e1f))
* **tracker:**
  * loading text ([75e63f3a](https://github.com/robinjoseph08/pokedextracker.com/commit/75e63f3afc01de9c9e089f728d53960ebab8ccd4))
  * fix scrolling for mobile ([c2e73696](https://github.com/robinjoseph08/pokedextracker.com/commit/c2e736966f125c613cb5fbf16570ea6e8affd9b3))
* **evolutions:** styles ([167848af](https://github.com/robinjoseph08/pokedextracker.com/commit/167848afb2c9d038ec0fce494f35489570add0d2))
* **number:** polyfill intl because of browser compat ([22f6d8ff](https://github.com/robinjoseph08/pokedextracker.com/commit/22f6d8ff2686785e14a5d01f7313a750a76aefba))
* **nav:** link to your tracker if logged in ([ac2f31dd](https://github.com/robinjoseph08/pokedextracker.com/commit/ac2f31ddccb4fd7c6da936b426a05c9d82d013fb))
* **font:**
  * fix m/f sign for set-captured-mobile ([0027653d](https://github.com/robinjoseph08/pokedextracker.com/commit/0027653d441adf0e242328b7a7051c94c127a7f3))
  * style m/f icons ([04379070](https://github.com/robinjoseph08/pokedextracker.com/commit/0437907076c0712924a4ef3e04e22e4e6f3842ef))
  * use font awesome male and female signs ([d0e982f2](https://github.com/robinjoseph08/pokedextracker.com/commit/d0e982f293f4e2ce6849bdb2104d5fcc6b22571e))
* **pokemon:**
  * add viewing class if viewing ([9aca670e](https://github.com/robinjoseph08/pokedextracker.com/commit/9aca670edaf494f887fe3781e916a4c71d4f84a7))
  * add empty class for empty boxes ([24844b75](https://github.com/robinjoseph08/pokedextracker.com/commit/24844b757d583457e5713b1b1a67e6efd1be2d8f))
* **style:** no hover for disabled ([f4434bd8](https://github.com/robinjoseph08/pokedextracker.com/commit/f4434bd8f3b63dfc4a37ba53bf41d157a98c91c8))
* **dex:** replace hover ux with clicks ([cd859a79](https://github.com/robinjoseph08/pokedextracker.com/commit/cd859a79caa51b6b8b3059b642db79d083064521))
* **form:** remove autocomplete etc ([2dde464e](https://github.com/robinjoseph08/pokedextracker.com/commit/2dde464e5d4978c3ab520ed04dc71e470d65e07e))
* **login:**
  * dumb mobile thing ([145b9c12](https://github.com/robinjoseph08/pokedextracker.com/commit/145b9c12ce3bfc8cfe722e05b5d674ac0532709c))
  * add maxlength ([e4df797f](https://github.com/robinjoseph08/pokedextracker.com/commit/e4df797f0f262dbf720069aa8a413883fa79cf42))

##### Refactors

* **event:** rename pokemonHover to activeChange ([d5b16a71](https://github.com/robinjoseph08/pokedextracker.com/commit/d5b16a713adfab07156d361a970939546fe8c680))

