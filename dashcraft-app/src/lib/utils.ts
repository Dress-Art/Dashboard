import {type ClassValue} from 'clsx'
import {clsx} from 'clsx'
import {twMerge} from 'tailwind-merge'

/**
 * Concatène intelligemment des classes Tailwind.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
