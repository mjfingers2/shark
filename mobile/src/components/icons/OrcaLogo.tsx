import Svg, { Path } from 'react-native-svg'
import { colors } from '../../theme/mobile-theme'
import { useMobileColorScheme } from '../../theme/use-mobile-color-scheme'

type Props = {
  size?: number
  color?: string
}

// Shark's fin-over-a-wave mark, the same drawing as the desktop's resources/logo.svg.
// The name stays OrcaLogo so the screens that use it need no change.
export function OrcaLogo({ size = 24, color = colors.textPrimary }: Props) {
  useMobileColorScheme()
  const aspectRatio = 320 / 204
  const width = size * aspectRatio
  return (
    <Svg width={width} height={size} viewBox="0 0 320 204">
      <Path fill={color} d="M104 150 C138 124 168 62 222 16 C206 68 206 112 238 150 Z" />
      <Path
        fill="none"
        stroke={color}
        strokeWidth={16}
        strokeLinecap="round"
        d="M22 174 C62 152 100 194 160 172 S258 152 298 174"
      />
    </Svg>
  )
}
