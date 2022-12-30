import { useRef, useState, useEffect } from 'react'
import { Color, AdditiveBlending, DoubleSide, MathUtils, ArcCurve } from 'three'
import { Canvas, extend, useFrame, Environment } from '@react-three/fiber'
import { OrbitControls, Sparkles, shaderMaterial, useGLTF, useTexture, useVideoTexture } from '@react-three/drei'
import glsl from 'babel-plugin-glsl/macro'
import * as THREE from 'three'
import { easing } from 'maath'
import { useSpring, animated } from '@react-spring/three'
import { EffectComposer, Scanline, ChromaticAberration, SSAO, ShockWave, Bloom } from '@react-three/postprocessing'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export const App = ({ scale = Array.from({ length: 50 }, () => 0.5 + Math.random() * 4) }) => (
  <Canvas camera={{ fov: 45, position: [-4, 2, -4] }}>
    <color attach="background" args={['#191920']} />
    <fog attach="fog" args={['#191920', 0, 15]} />
    <EffectComposer>
      <Bloom luminanceThreshold={1} intensity={3} levels={9} mipmapBlur />
    </EffectComposer>
    <Model />
    <OrbitControls />
  </Canvas>
)

function Model(props) {
  var BounceP = new THREE.Vector3()
  const portalMaterial = useRef()
  const bakedTexture = useTexture('/bg.png')
  const bakedTexture1 = useTexture('/12.png')

  const [active, setActive] = useState(false)
  const ref = useRef()
  const particlesGeometry = new THREE.PlaneBufferGeometry(20, 20, 1000, 400)
  //const particlesGeometry = new THREE.PlaneBufferGeometry(4.8 * 1.745, 8.2 * 1.745, 960, 1640)
  useFrame((state, delta) => {
    portalMaterial.current.time += delta = +0.05
    portalMaterial.current.t = bakedTexture
    portalMaterial.current.t1 = bakedTexture1
    portalMaterial.current.resolution = ref
    portalMaterial.current.progress = state.mouse.x
    portalMaterial.current.distortion = state.mouse.y * 2
    //console.log(state.mouse)
  })
  return (
    <group {...props} dispose={null}>
      <points
        ref={ref}
        geometry={particlesGeometry}
        position={[0, 0.78, 1.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        //onPointerMove={(e) => (BounceP = e.point)}
        //onPointerEnter={() => setActive(true)}
      >
        <portalMaterial
          ref={portalMaterial}
          t={bakedTexture}
          t1={bakedTexture1}
          resolution={ref}
          side={DoubleSide}
          distortion={1}
          emissiveIntensity={0.0}
          //blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

extend({
  // shaderMaterial creates a THREE.ShaderMaterial, and auto-creates uniform setter/getters
  // extend makes it available in JSX, in this case <portalMaterial />
  PortalMaterial: shaderMaterial(
    {
      time: 0,
      progress: 0,
      distortion: 0,
      t: new THREE.Texture(),
      t1: new THREE.Texture(),
      resolution: new THREE.PlaneBufferGeometry(),
      uvRate1: new THREE.Vector2(1, 1),
    },
    glsl`
    uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform sampler2D texture1;
uniform float distortion;
    float PI = 3.141592653589793238;

    vec3 mod289(vec3 x)
    {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 mod289(vec4 x)
    {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }
    
    vec4 permute(vec4 x)
    {
      return mod289(((x*34.0)+10.0)*x);
    }
    
    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }
    
    vec3 fade(vec3 t) {
      return t*t*t*(t*(t*6.0-15.0)+10.0);
    }
    
    // Classic Perlin noise
    float cnoise(vec3 P)
    {
      vec3 Pi0 = floor(P); // Integer part for indexing
      vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
      Pi0 = mod289(Pi0);
      Pi1 = mod289(Pi1);
      vec3 Pf0 = fract(P); // Fractional part for interpolation
      vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;
    
      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);
    
      vec4 gx0 = ixy0 * (1.0 / 7.0);
      vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    
      vec4 gx1 = ixy1 * (1.0 / 7.0);
      vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    
      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    
      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x;
      g010 *= norm0.y;
      g100 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x;
      g011 *= norm1.y;
      g101 *= norm1.z;
      g111 *= norm1.w;
    
      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);
    
      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
      return 2.2 * n_xyz;
    }
    
    // Classic Perlin noise, periodic variant
    float pnoise(vec3 P, vec3 rep)
    {
      vec3 Pi0 = mod(floor(P), rep); // Integer part, modulo period
      vec3 Pi1 = mod(Pi0 + vec3(1.0), rep); // Integer part + 1, mod period
      Pi0 = mod289(Pi0);
      Pi1 = mod289(Pi1);
      vec3 Pf0 = fract(P); // Fractional part for interpolation
      vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
      vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
      vec4 iy = vec4(Pi0.yy, Pi1.yy);
      vec4 iz0 = Pi0.zzzz;
      vec4 iz1 = Pi1.zzzz;
    
      vec4 ixy = permute(permute(ix) + iy);
      vec4 ixy0 = permute(ixy + iz0);
      vec4 ixy1 = permute(ixy + iz1);
    
      vec4 gx0 = ixy0 * (1.0 / 7.0);
      vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
      gx0 = fract(gx0);
      vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
      vec4 sz0 = step(gz0, vec4(0.0));
      gx0 -= sz0 * (step(0.0, gx0) - 0.5);
      gy0 -= sz0 * (step(0.0, gy0) - 0.5);
    
      vec4 gx1 = ixy1 * (1.0 / 7.0);
      vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
      gx1 = fract(gx1);
      vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
      vec4 sz1 = step(gz1, vec4(0.0));
      gx1 -= sz1 * (step(0.0, gx1) - 0.5);
      gy1 -= sz1 * (step(0.0, gy1) - 0.5);
    
      vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
      vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
      vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
      vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
      vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
      vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
      vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
      vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
    
      vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
      g000 *= norm0.x;
      g010 *= norm0.y;
      g100 *= norm0.z;
      g110 *= norm0.w;
      vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
      g001 *= norm1.x;
      g011 *= norm1.y;
      g101 *= norm1.z;
      g111 *= norm1.w;
    
      float n000 = dot(g000, Pf0);
      float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
      float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
      float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
      float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
      float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
      float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
      float n111 = dot(g111, Pf1);
    
      vec3 fade_xyz = fade(Pf0);
      vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
      vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
      float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
      return 2.2 * n_xyz;
    }
    
    
    mat3 rotation3dY(float angle) {
      float s = sin(angle);
      float c = cos(angle);
    
      return mat3(
        c, 0.0, -s,
        0.0, 1.0, 0.0,
        s, 0.0, c
      );
    }
    
    float saturate(float x)
    {
      return clamp(x, 0.0, 1.0);
    }
    
    vec3 curlNoise(vec3 p)
    {
    
      // return curlNoise(p);
      const float step = 0.01;
      float ddx = cnoise(p+vec3(step, 0.0, 0.0)) - cnoise(p-vec3(step, 0.0, 0.0));
      float ddy = cnoise(p+vec3(0.0, step, 0.0)) - cnoise(p-vec3(0.0, step, 0.0));
      float ddz = cnoise(p+vec3(0.0, 0.0, step)) - cnoise(p-vec3(0.0, 0.0, step));
    
      const float divisor = 1.0 / ( 2.0 * step );
      return ( vec3(ddy - ddz, ddz - ddx, ddx - ddy) * divisor );
    }
    
    vec3 fbm_vec3(vec3 p, float frequency, float offset)
    {
      return vec3(
        cnoise((p+vec3(offset))*frequency),
        cnoise((p+vec3(offset+20.0))*frequency),
        cnoise((p+vec3(offset-30.0))*frequency)
      );
    }
    
    
    void main() {
     vUv= uv;
    
    vec3 distortion1 = vec3(position.x*2.,position.y,1.)*curlNoise(vec3(
    position.x*0.002 +time*0.1,
    position.y*0.008 + time*0.1,
    (position.x + position.y)*0.02
    ))*distortion;
    
    vec3 finalPosition = position + distortion1;
    
    
    
     vec4 mvPosition = modelViewMatrix * vec4( finalPosition, 1. );
     gl_PointSize= 2.;
     gl_Position = projectionMatrix * mvPosition;
    }`,
    glsl`
    uniform float progress;
uniform sampler2D t;
uniform sampler2D t1;
varying vec2 vUv;
varying vec3 vPosition;
float PI = 3.141592653589793238;
void main(){
//vec2 newUV = (vUv - vec2(0.5))*resolution.zw + vec2(0.5);
//gl_FragColor = vec4(1.,0,0.0,1.);
vec4 tt = texture2D(t,vUv);
vec4 tt1 = texture2D(t1,vUv);
vec4 finalTexture = mix(tt,tt1,progress);
gl_FragColor = finalTexture;
if(gl_FragColor.r<0.1 && gl_FragColor.b<0.1 && gl_FragColor.g<0.1) 
discard;
//gl_FragColor = vec4(1.,0.,0.,0.5);
}`,
  ),
})
