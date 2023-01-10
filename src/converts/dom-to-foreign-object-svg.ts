import { cloneNode } from '../clone-node'
import { embedWebFont } from '../embed-web-font'
import { embedNode } from '../embed-node'
import { removeDefaultStyleSandbox } from '../get-default-style'
import { consoleTime, consoleTimeEnd } from '../log'
import { resolveOptions } from '../resolve-options'
import { createSvg, isElementNode, isSVGElementNode } from '../utils'

import type { Options, ResolvedOptions } from '../options'

const fixStyles = `<style>
  .______background-clip--text {
    background-clip: text;
    -webkit-background-clip: text;
  }
</style>`.replace(/(\n| {2})/ig, '')

function createForeignObjectSvg(clone: Node, options: ResolvedOptions): SVGSVGElement {
  const { width, height } = options
  const svg = createSvg(width, height, clone.ownerDocument)
  const foreignObject = svg.ownerDocument.createElementNS(svg.namespaceURI, 'foreignObject')
  svg.innerHTML = fixStyles
  foreignObject.setAttributeNS(null, 'x', '0%')
  foreignObject.setAttributeNS(null, 'y', '0%')
  foreignObject.setAttributeNS(null, 'width', '100%')
  foreignObject.setAttributeNS(null, 'height', '100%')
  foreignObject.setAttributeNS(null, 'externalResourcesRequired', 'true')
  foreignObject.append(clone)
  svg.appendChild(foreignObject)
  return svg
}

export async function domToForeignObjectSvg<T extends Node>(
  node: T,
  options?: Options,
): Promise<SVGElement> {
  if (isElementNode(node) && isSVGElementNode(node)) return node
  const resolved = await resolveOptions(node, options)

  options?.debug && consoleTime('clone node')
  const clone = cloneNode(node, resolved)
  options?.debug && consoleTimeEnd('clone node')

  removeDefaultStyleSandbox()

  if (resolved.font !== false && isElementNode(clone)) {
    options?.debug && consoleTime('embed web font')
    await embedWebFont(clone, resolved)
    options?.debug && consoleTimeEnd('embed web font')
  }

  const tasks = embedNode(clone, resolved)
  const count = tasks.length
  let current = 0

  options?.debug && consoleTime('embed node')
  await Promise.all(tasks.map(task => task.finally(() => options?.progress?.(++current, count))))
  options?.debug && consoleTimeEnd('embed node')

  return createForeignObjectSvg(clone, resolved)
}