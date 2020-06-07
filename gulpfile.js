// 实现这个项目的构建任务
const {src, dest, parallel, series, watch} = require('gulp')
const del = require('del')
const browserSync = require('browser-sync')
const bs = browserSync.create()
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
const {sass, babel, swig, imagemin, ghPages} = plugins
const config = {
  production: false,
  port: 2080,
  open: false
}
const isMini = () => config.production

const calculateConfig = () => {
  const argv = process.argv
  console.log(argv)
  const task = argv[2]
  if(task === 'develop') {
    config.production = false
    config.open = argv.includes('--open')
    config.port = argv.includes('--port') && parseInt(argv[argv.indexOf('--port')+1], 10) || 2080
  } else if (task === 'build') {
    config.production = argv.includes('--production') || argv.includes('--prod')
  } else if (task === 'start') {
    config.open = argv.includes('--open')
    config.port = argv.includes('--port') && parseInt(argv[argv.indexOf('--port')+1], 10) || 2080
  }
  console.log('config', config)
}

calculateConfig()

const data = {
  menus: [
    {
      name: 'Home',
      icon: 'aperture',
      link: 'index.html'
    },
    {
      name: 'Features',
      link: 'features.html'
    },
    {
      name: 'About',
      link: 'about.html'
    },
    {
      name: 'Contact',
      link: '#',
      children: [
        {
          name: 'Twitter',
          link: 'https://twitter.com/w_zce'
        },
        {
          name: 'About',
          link: 'https://weibo.com/zceme'
        },
        {
          name: 'divider'
        },
        {
          name: 'About',
          link: 'https://github.com/zce'
        }
      ]
    }
  ],
  pkg: require('./package.json'),
  date: new Date()
}

// Clean the dist & temp files.
const clean = () => {
  return del(['dist', 'temp'])
}

const style = () => {
  return src('src/assets/styles/*.scss', { base: 'src' })
  .pipe(sass({ outputStyle: 'expanded' }))
  .pipe(dest('temp'))
  .pipe(bs.reload({stream: true}))
}

const script = () => {
  return src('src/assets/scripts/*.js', { base: 'src' })
  .pipe(babel({ presets: ['@babel/preset-env'] }))
  .pipe(dest('temp'))
  .pipe(bs.reload({stream: true}))
}

const page = () => {
  return src('src/**/*.html', {base: 'src'})
  .pipe(swig(data))
  .pipe(dest('temp'))
  .pipe(bs.reload({stream: true}))
}

const image = () => {
  return src('src/assets/images/**', {base: 'src'})
  .pipe(imagemin())
  .pipe(dest('dist'))
}

const font = () => {
  return src('src/assets/fonts/**', {base: 'src'})
  .pipe(imagemin())
  .pipe(dest('dist'))
}

const extra = () => {
  return src('public/**', {base: 'public'})
  .pipe(dest('dist'))
}

const serve = () => {
  watch('src/assets/styles/*.scss', style)
  watch('src/assets/scripts/*.js', script)
  watch('src/*.html', page)

  watch([
    'src/assets/images/**',
    'src/assets/fonts/**',
    'public/**'
  ], bs.reload)

  bs.init({
    notify: false,
    port: config.port,
    open: config.open,
    // files: 'temp/**',
    server: {
      baseDir: ['temp', 'src', 'public'], // 按顺序查找
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

const useref = () => {
  return src('temp/*.html', { base: 'temp' })
  .pipe(plugins.useref({ searchPath: ['temp', '.'] }))
  .pipe(plugins.if(/\.js$/, plugins.uglify()))
  .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
  .pipe(plugins.if(/\.html$/, plugins.htmlmin({
    collapseWhitespace: isMini(),
    minifyCSS: isMini(),
    minifyJS: isMini()
  })))
  .pipe(dest('dist'))
}

const deploy = () => {
  return src('dist/**/*')
    .pipe(ghPages())
}

const lint = parallel(style, script)

const compile = parallel(style, script, page)

const develop = series(compile, serve)

const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  )
)

const start = series(compile, serve)

module.exports = {
  clean,
  compile,
  build,
  develop,
  start,
  deploy,
  lint
}